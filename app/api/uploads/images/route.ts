import { type NextRequest, NextResponse } from "next/server";
import { getAnonSessionId, getSessionUser } from "@/lib/auth/session";
import { getChat, isChatOwner } from "@/lib/db/chats";
import { uploadImage } from "@/lib/storage/upload";

const MAX_SIZE = parseInt(process.env.MAX_IMAGE_SIZE_BYTES ?? "5242880", 10); // 5MB

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  const anonId = getAnonSessionId(req);

  if (!user && !anonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }

  const chat = await getChat(chatId);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isChatOwner(chat, user?.id, anonId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_SIZE / 1024 / 1024}MB limit` },
      { status: 413 },
    );
  }

  const url = await uploadImage(file, chatId);
  return NextResponse.json({ url }, { status: 201 });
}
