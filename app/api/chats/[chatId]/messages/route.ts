import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import {
  ANON_QUESTION_LIMIT,
  getAnonSessionId,
  getSessionUser,
} from "@/lib/auth/session";
import {
  getOrCreateAnonSession,
  incrementAnonQuestions,
} from "@/lib/db/anonymous-sessions";
import { createChat, getChat, isChatOwner, touchChat } from "@/lib/db/chats";
import { listDocuments } from "@/lib/db/documents";
import {
  createMessage,
  getRecentMessages,
  listMessages,
} from "@/lib/db/messages";
import { CHAT_MODEL } from "@/lib/openai";
import {
  broadcastRealtime,
  getChatsRealtimeTopic,
} from "@/lib/supabase/broadcast";
import type { MessageAttachment } from "@/types/db";

type Params = { params: Promise<{ chatId: string }> };

// Max characters of document text injected into the system prompt.
// Prevents exceeding the model's context window for large uploads.
const MAX_DOC_CONTEXT_CHARS = 100_000;

export async function GET(req: NextRequest, { params }: Params) {
  const { chatId } = await params;
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  const chat = await getChat(chatId);
  // Chat not created yet (lazy creation flow) — return empty history
  if (!chat) return NextResponse.json({ messages: [], nextCursor: null });
  if (!isChatOwner(chat, user?.id, anonId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  const result = await listMessages(chatId, cursor);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { chatId } = await params;
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  if (!user && !anonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let chat = await getChat(chatId);
  if (!chat) {
    // Lazy creation: chat UUID was generated client-side, create it on first message
    chat = await createChat({
      id: chatId,
      userId: user?.id,
      sessionId: user ? undefined : (anonId ?? undefined),
    });
  } else if (!isChatOwner(chat, user?.id, anonId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Read-only pre-check: reject immediately if the limit is already reached.
  // The actual atomic increment happens in onFinish so a failed AI request
  // does not consume a free question.
  if (!user && anonId) {
    const session = await getOrCreateAnonSession(anonId);
    if (session.questions_used >= ANON_QUESTION_LIMIT) {
      return NextResponse.json(
        {
          error: `Free limit of ${ANON_QUESTION_LIMIT} questions reached. Please sign up to continue.`,
          code: "ANON_LIMIT",
        },
        { status: 429 },
      );
    }
  }

  // AI SDK sends { messages: UIMessage[] }
  const body = await req.json().catch(() => null);
  if (!body?.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const clientMessages: UIMessage[] = body.messages;
  const lastMessage = clientMessages[clientMessages.length - 1];

  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "No user message found" },
      { status: 400 },
    );
  }

  // Extract text content from message parts
  const textContent = lastMessage.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  if (!textContent.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 },
    );
  }

  // Extract image attachments from file parts
  const imageAttachments: MessageAttachment[] = lastMessage.parts
    .filter(
      (p): p is { type: "file"; url: string; mediaType: string } =>
        p.type === "file" &&
        typeof (p as { url?: string }).url === "string" &&
        ((p as { mediaType?: string }).mediaType?.startsWith("image/") ??
          false),
    )
    .map((p) => ({
      type: "image" as const,
      url: p.url,
      name: "image",
      mime_type: p.mediaType,
    }));

  // Extract document attachments sent via transport body
  type DocAttachmentInput = { document_id: string; name: string; mime_type?: string };
  const documentAttachments: MessageAttachment[] = (
    Array.isArray(body.documentAttachments) ? (body.documentAttachments as unknown[]) : []
  )
    .filter(
      (d): d is DocAttachmentInput =>
        typeof d === "object" &&
        d !== null &&
        typeof (d as { document_id?: unknown }).document_id === "string",
    )
    .map((d) => ({
      type: "document" as const,
      document_id: d.document_id,
      name: d.name,
      mime_type: d.mime_type,
    }));

  // Persist user message to DB
  await createMessage({
    chatId,
    role: "user",
    content: textContent,
    attachments: [...imageAttachments, ...documentAttachments],
  });

  const topic = getChatsRealtimeTopic(user?.id, anonId);
  if (topic) {
    await broadcastRealtime(topic, [
      { event: "messages_changed", payload: { chatId } },
    ]);
  }

  // Load full history from DB for context
  const history = await getRecentMessages(chatId, 20);

  // Build document context, capped to avoid exceeding the model context window
  const documents = await listDocuments(chatId);
  let documentContext = "";
  if (documents.length > 0) {
    const parts = documents
      .filter((d) => d.text_content)
      .map((d) => `--- Document: ${d.filename} ---\n${d.text_content}`);
    if (parts.length > 0) {
      let raw = `\n\nThe user has uploaded the following documents for context:\n\n${parts.join("\n\n")}`;
      if (raw.length > MAX_DOC_CONTEXT_CHARS) {
        raw =
          raw.slice(0, MAX_DOC_CONTEXT_CHARS) +
          "\n\n[Documents truncated due to size limit]";
      }
      documentContext = raw;
    }
  }

  const systemPrompt = `You are a helpful AI assistant. Answer clearly and concisely.${documentContext}`;

  // Build UIMessages from DB history (source of truth)
  const uiMessages: UIMessage[] = history.map((msg) => {
    const parts: UIMessage["parts"] = [];

    if (msg.content) {
      parts.push({ type: "text", text: msg.content });
    }

    for (const att of msg.attachments) {
      if (att.type === "image" && att.url) {
        parts.push({
          type: "file",
          mediaType: (att.mime_type ?? "image/jpeg") as `${string}/${string}`,
          url: att.url,
        });
      }
    }

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts,
      content: msg.content,
      createdAt: new Date(msg.created_at),
    };
  });

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: openai.responses(CHAT_MODEL),
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      await createMessage({ chatId, role: "assistant", content: text });
      await touchChat(chatId);

      if (topic) {
        const events: Array<{
          event: string;
          payload?: Record<string, unknown>;
        }> = [
          { event: "messages_changed", payload: { chatId } },
          { event: "chat_updated", payload: { id: chatId } },
        ];

        // Auto-title from the very first message (history has exactly 1 entry:
        // the user message saved above, before getRecentMessages was called).
        if (history.length === 1 && chat.title === "New Chat") {
          const title = textContent.slice(0, 60).trim();
          if (title) {
            const { updateChatTitle } = await import("@/lib/db/chats");
            await updateChatTitle(chatId, title);
            events[1] = {
              event: "chat_updated",
              payload: { id: chatId, title },
            };
          }
        }

        await broadcastRealtime(topic, events);
      }

      // Increment anon question counter only after a successful response so a
      // failed AI request does not waste a free question.
      if (!user && anonId) {
        await incrementAnonQuestions(anonId);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
