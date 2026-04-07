import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnonSessionId, getSessionUser } from "@/lib/auth/session";
import { createChat, listChats, listChatsBySession } from "@/lib/db/chats";
import {
  broadcastRealtime,
  getChatsRealtimeTopic,
} from "@/lib/supabase/broadcast";

const createSchema = z.object({
  title: z.string().max(200).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  if (!user && !anonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
  if (user) {
    return NextResponse.json(await listChats(user.id, cursor));
  }
  if (!anonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listChatsBySession(anonId, cursor));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  if (!user && !anonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const chat = await createChat({
    userId: user?.id,
    sessionId: user ? undefined : (anonId ?? undefined),
    title: parsed.data.title,
  });

  const topic = getChatsRealtimeTopic(user?.id, anonId);
  if (topic) {
    await broadcastRealtime(topic, [
      {
        event: "chat_created",
        payload: {
          id: chat.id,
          title: chat.title,
          created_at: chat.created_at,
        },
      },
    ]);
  }

  return NextResponse.json({ chat }, { status: 201 });
}
