import { type NextRequest, NextResponse } from "next/server";
import { getAnonSessionId, getSessionUser } from "@/lib/auth/session";
import { getChat, isChatOwner } from "@/lib/db/chats";
import { createDocument } from "@/lib/db/documents";

const MAX_SIZE = parseInt(
  process.env.MAX_DOCUMENT_SIZE_BYTES ?? "20971520",
  10,
); // 20MB

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
};

async function extractText(file: File): Promise<string> {
  const mimeType = file.type;

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return file.text();
  }

  if (mimeType === "application/pdf") {
    try {
      const { extractText: pdfExtractText } = await import("unpdf");
      const buffer = await file.arrayBuffer();
      const { text } = await pdfExtractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      return text ?? "";
    } catch {
      return "[PDF content could not be extracted]";
    }
  }

  return "";
}

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

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, TXT, MD" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_SIZE / 1024 / 1024}MB limit` },
      { status: 413 },
    );
  }

  // Extract text content to pass directly to the model
  const textContent = await extractText(file);

  const document = await createDocument({
    chatId,
    userId: user?.id,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    textContent,
  });

  return NextResponse.json({ document }, { status: 201 });
}
