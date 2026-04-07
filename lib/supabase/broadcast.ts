/**
 * Server-only: broadcast to browser clients subscribed to the same topic
 * (see useRealtimeChatSync). Failures are ignored so API handlers still succeed.
 */
export function getChatsRealtimeTopic(
  userId: string | undefined,
  anonSessionId: string | null | undefined,
): string | null {
  if (userId) return `chats:${userId}`;
  if (anonSessionId) return `anon-chats:${anonSessionId}`;
  return null;
}

export async function broadcastRealtime(
  topic: string,
  messages: Array<{ event: string; payload?: Record<string, unknown> }>,
): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          topic,
          event: m.event,
          payload: m.payload ?? {},
        })),
      }),
    });
  } catch {
    // ignore
  }
}
