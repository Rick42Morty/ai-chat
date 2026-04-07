import { createClient } from "@supabase/supabase-js";

// Service-role client — SERVER ONLY. Never import from client components.
// All DB access goes through this client via API routes.
//
// A fresh client is created per call intentionally: auth routes call
// supabase.auth.signIn* which stores the user JWT in the client's in-memory
// session even with persistSession:false. A singleton would share that mutated
// state across requests, causing subsequent storage/db calls to use the user
// JWT instead of the service-role key.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
