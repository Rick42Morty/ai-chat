import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Message, MessageAttachment } from "@/types/db";

const PAGE_SIZE = 50;

export async function listMessages(
  chatId: string,
  cursor?: string,
): Promise<{ messages: Message[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const messages = (data ?? []).reverse();
  const hasMore = messages.length > PAGE_SIZE;
  const result = hasMore ? messages.slice(1) : messages;
  const nextCursor = hasMore ? result[0].created_at : null;

  return { messages: result, nextCursor };
}

export async function getRecentMessages(
  chatId: string,
  limit = 20,
): Promise<Message[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).reverse();
}

export async function createMessage(params: {
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: MessageAttachment[];
}): Promise<Message> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: params.chatId,
      role: params.role,
      content: params.content,
      attachments: params.attachments ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
