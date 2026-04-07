import { ANON_QUESTION_LIMIT } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AnonymousSession } from "@/types/db";

export async function getOrCreateAnonSession(
  sessionId: string,
): Promise<AnonymousSession> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("anonymous_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (existing) {
    // Fire-and-forget: last_seen_at is informational only
    void supabase
      .from("anonymous_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", sessionId);
    return existing;
  }

  const { data, error } = await supabase
    .from("anonymous_sessions")
    .insert({ id: sessionId, questions_used: 0 })
    .select()
    .single();

  if (error) {
    // Concurrent request already created the row — just return it
    const { data: concurrent, error: fetchError } = await supabase
      .from("anonymous_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (fetchError) throw fetchError;
    return concurrent;
  }
  return data;
}

// Atomically increments the question counter via a Postgres function so the
// read-check-write cannot race. Returns whether the increment was allowed.
export async function incrementAnonQuestions(
  sessionId: string,
): Promise<{ allowed: boolean; questions_used: number }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("try_increment_anon_questions", {
    p_session_id: sessionId,
    p_limit: ANON_QUESTION_LIMIT,
  });

  if (error) throw error;
  return data as { allowed: boolean; questions_used: number };
}
