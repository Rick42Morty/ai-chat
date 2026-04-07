import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Chat } from "@/types/db";

const PAGE_SIZE = 20;

export async function listChats(
  userId: string,
  cursor?: string,
): Promise<{ chats: Chat[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("chats")
    .select("id, user_id, session_id, title, created_at, updated_at, messages!inner(id)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const chats = (data ?? []).map(({ messages: _m, ...chat }) => chat) as Chat[];
  const hasMore = chats.length > PAGE_SIZE;
  const result = hasMore ? chats.slice(0, PAGE_SIZE) : chats;
  const nextCursor = hasMore ? result[result.length - 1].updated_at : null;

  return { chats: result, nextCursor };
}

export async function listChatsBySession(
  sessionId: string,
  cursor?: string,
): Promise<{ chats: Chat[]; nextCursor: string | null }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("chats")
    .select("id, user_id, session_id, title, created_at, updated_at, messages!inner(id)")
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("updated_at", cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const chats = (data ?? []).map(({ messages: _m, ...chat }) => chat) as Chat[];
  const hasMore = chats.length > PAGE_SIZE;
  const result = hasMore ? chats.slice(0, PAGE_SIZE) : chats;
  const nextCursor = hasMore ? result[result.length - 1].updated_at : null;

  return { chats: result, nextCursor };
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single();
  return data;
}

export async function createChat(params: {
  id?: string;
  userId?: string;
  sessionId?: string;
  title?: string;
}): Promise<Chat> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chats")
    .insert({
      ...(params.id ? { id: params.id } : {}),
      user_id: params.userId ?? null,
      session_id: params.sessionId ?? null,
      title: params.title ?? "New Chat",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChatTitle(
  chatId: string,
  title: string,
): Promise<Chat> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", chatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function touchChat(chatId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);
}

export async function deleteChat(chatId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

export function isChatOwner(
  chat: Chat,
  userId?: string | null,
  sessionId?: string | null,
): boolean {
  if (userId && chat.user_id === userId) return true;
  if (sessionId && chat.session_id === sessionId) return true;
  return false;
}
