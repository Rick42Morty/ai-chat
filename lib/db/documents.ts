import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Document } from "@/types/db";

export async function listDocuments(chatId: string): Promise<Document[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createDocument(params: {
  chatId: string;
  userId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  textContent: string | null;
}): Promise<Document> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      chat_id: params.chatId,
      user_id: params.userId ?? null,
      filename: params.filename,
      mime_type: params.mimeType,
      size_bytes: params.sizeBytes,
      text_content: params.textContent,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

