import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth/session";

export async function GET() {
  const profile = await getSessionProfile();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: profile });
}
