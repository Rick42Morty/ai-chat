"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Anon-key client — safe to use in the browser, only for Realtime subscriptions.
// Never used for DB reads/writes (those go through API routes).
export function getRealtimeClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return client;
}
