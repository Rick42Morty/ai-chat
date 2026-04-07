"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileUIPart } from "ai";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { toast } from "sonner";
import { ChatLoadingSkeleton } from "@/components/chat/ChatLoadingSkeleton";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { SuggestedPromptsList } from "@/components/chat/SuggestedPromptsList";
import { AnonymousBanner } from "@/components/shared/AnonymousBanner";
import { useAnonymousSession } from "@/hooks/useAnonymousSession";
import { useFileUpload } from "@/hooks/useFileUpload";
import { apiClient, getAnonSessionId } from "@/lib/api-client";
import {
  dbMessagesToUIMessages,
  mergeUIMessageIdsPreserve,
} from "@/lib/chat/db-messages-to-ui";
import { useAuth } from "@/providers/AuthProvider";
import type { ListMessagesResponse } from "@/types/api";
import type { MessageAttachment } from "@/types/db";

interface Props {
  chatId: string;
}

/** Survives React Strict Mode remounts (refs reset); dedupes auto-prompt only. */
const autoPromptSentKeys = new Set<string>();

export function ChatView({ chatId }: Props) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: historyData, isPending: historyPending } = useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: () =>
      apiClient.get<ListMessagesResponse>(`/api/chats/${chatId}/messages`),
    // Always refetch when opening a chat so switching threads never shows stale history
    // (Infinity cache caused missing messages after visiting another chat).
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: anonSession } = useAnonymousSession();

  const {
    attachments,
    uploadImage,
    uploadDocument,
    removeAttachment,
    clearAttachments,
  } = useFileUpload(chatId);

  const pendingDocAttachmentsRef = useRef<
    Array<{ document_id: string; name: string; mime_type?: string }>
  >([]);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}/messages`,
      headers: {
        "x-anonymous-session-id": getAnonSessionId(),
      },
      body: () => ({ documentAttachments: pendingDocAttachmentsRef.current }),
    }),
    onError: (err) => {
      const msg = err.message ?? "Something went wrong";
      if (msg.includes("ANON_LIMIT") || msg.toLowerCase().includes("limit")) {
        toast.error("Free limit reached. Sign up to continue.", {
          action: {
            label: "Sign up",
            onClick: () => (window.location.href = "/signup"),
          },
        });
      } else {
        toast.error(msg);
      }
    },
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["anon-session"] });
    },
  });

  useEffect(() => {
    if (!historyData?.messages) return;
    // Don't overwrite SDK in-flight state during streaming — a mid-stream
    // DB refetch (triggered by the realtime broadcast) would clobber the
    // partial assistant message and cause a visible flash.
    if (status === "streaming" || status === "submitted") return;
    const fromDb = dbMessagesToUIMessages(historyData.messages);
    setMessages((prev) => mergeUIMessageIdsPreserve(prev, fromDb));
  }, [chatId, historyData, setMessages, status]);

  const handleSend = useCallback(
    async (content: string, pendingAttachments: MessageAttachment[]) => {
      const files: FileUIPart[] = pendingAttachments
        .filter(
          (a): a is MessageAttachment & { url: string } =>
            a.type === "image" &&
            typeof a.url === "string" &&
            !("uploading" in a && (a as { uploading?: boolean }).uploading),
        )
        .map((a) => ({
          type: "file" as const,
          url: a.url,
          mediaType: (a.mime_type ?? "image/jpeg") as `${string}/${string}`,
        }));

      pendingDocAttachmentsRef.current = pendingAttachments
        .filter(
          (a): a is MessageAttachment & { document_id: string } =>
            a.type === "document" && typeof a.document_id === "string",
        )
        .map((a) => ({
          document_id: a.document_id,
          name: a.name,
          mime_type: a.mime_type,
        }));

      clearAttachments();
      await sendMessage({ text: content, files });
      pendingDocAttachmentsRef.current = [];
    },
    [sendMessage, clearAttachments],
  );

  useLayoutEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt) return;
    if (historyData?.messages && historyData.messages.length > 0) return;

    const fromNewComposer = searchParams.get("new") === "1";
    if (!fromNewComposer && (historyPending || !historyData)) return;

    const dedupeKey = `${chatId}\0${prompt}`;
    if (autoPromptSentKeys.has(dedupeKey)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("prompt");
      params.delete("new");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        qs ? `/chat/${chatId}?${qs}` : `/chat/${chatId}`,
      );
      return;
    }
    autoPromptSentKeys.add(dedupeKey);

    void sendMessage({ text: prompt });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("prompt");
    params.delete("new");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      qs ? `/chat/${chatId}?${qs}` : `/chat/${chatId}`,
    );
  }, [chatId, searchParams, sendMessage, historyPending, historyData]);

  const isStreaming = status === "streaming" || status === "submitted";
  const limitReached =
    !user && anonSession !== undefined && anonSession.remaining === 0;

  const showSuggestedPrompts =
    !historyPending && messages.length === 0 && !isStreaming;

  const showHistorySkeleton =
    historyPending && messages.length === 0 && status === "ready";

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {!user && <AnonymousBanner />}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {showSuggestedPrompts && (
          <SuggestedPromptsList
            onSelect={(p) => void handleSend(p, [])}
          />
        )}
        {showHistorySkeleton ? (
          <ChatLoadingSkeleton />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        attachments={attachments}
        onUploadImage={uploadImage}
        onUploadDocument={uploadDocument}
        onRemoveAttachment={removeAttachment}
        disabled={showHistorySkeleton || limitReached}
      />
    </div>
  );
}
