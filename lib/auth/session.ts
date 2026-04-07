import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Profile } from "@/types/db";

export const SESSION_COOKIE = "sb-session";
export const ANON_SESSION_COOKIE = "anon-session-id";
export const ANON_QUESTION_LIMIT = 3;

export interface SessionUser {
  id: string;
  email: string;
}

// Verify the Supabase JWT using the project's public JWKS endpoint.
// This is the recommended approach — no shared secret needed.
// jose caches the JWKS response automatically.
const getJWKS = () => {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  return createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
};

export async function getSessionUser(
  req?: NextRequest,
): Promise<SessionUser | null> {
  try {
    let token: string | undefined;

    if (req) {
      token = req.cookies.get(SESSION_COOKIE)?.value;
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE)?.value;
    }

    if (!token) return null;

    const { payload } = await jwtVerify(token, getJWKS());

    if (!payload.sub || !payload.email) return null;

    return { id: payload.sub, email: payload.email as string };
  } catch {
    return null;
  }
}

// Get full profile for a session user
export async function getSessionProfile(
  req?: NextRequest,
): Promise<Profile | null> {
  const user = await getSessionUser(req);
  if (!user) return null;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

// Extract anonymous session ID from cookie or header
export function getAnonSessionId(req: NextRequest): string | null {
  return (
    req.cookies.get(ANON_SESSION_COOKIE)?.value ??
    req.headers.get("x-anonymous-session-id") ??
    null
  );
}
