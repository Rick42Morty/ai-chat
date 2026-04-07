import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnonSessionId, getSessionUser } from "@/lib/auth/session";
import {
  deleteChat,
  getChat,
  isChatOwner,
  updateChatTitle,
} from "@/lib/db/chats";
import {
  broadcastRealtime,
  getChatsRealtimeTopic,
} from "@/lib/supabase/broadcast";

type Params = { params: Promise<{ chatId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { chatId } = await params;
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  const chat = await getChat(chatId);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isChatOwner(chat, user?.id, anonId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ chat });
}

const patchSchema = z.object({ title: z.string().min(1).max(200) });

export async function PATCH(req: NextRequest, { params }: Params) {
  const { chatId } = await params;
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  const chat = await getChat(chatId);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isChatOwner(chat, user?.id, anonId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const updated = await updateChatTitle(chatId, parsed.data.title);
  const topic = getChatsRealtimeTopic(user?.id, anonId);
  if (topic) {
    await broadcastRealtime(topic, [
      {
        event: "chat_updated",
        payload: { id: chatId, title: updated.title },
      },
    ]);
  }
  return NextResponse.json({ chat: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { chatId } = await params;
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  const chat = await getChat(chatId);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isChatOwner(chat, user?.id, anonId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteChat(chatId);
  const topic = getChatsRealtimeTopic(user?.id, anonId);
  if (topic) {
    await broadcastRealtime(topic, [
      { event: "chat_deleted", payload: { chatId } },
    ]);
  }
  return NextResponse.json({ ok: true });
}
