import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { email, password, display_name } = parsed.data;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Signup failed" },
      { status: 400 },
    );
  }

  // Create profile row
  await supabase.from("profiles").insert({
    id: data.user.id,
    email,
    display_name: display_name ?? null,
  });

  // Sign in to get a session token
  const { data: session, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !session.session) {
    return NextResponse.json(
      { error: "Account created but sign-in failed. Please log in." },
      { status: 201 },
    );
  }

  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, session.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
