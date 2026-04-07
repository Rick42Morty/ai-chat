import { type NextRequest, NextResponse } from "next/server";
import { ANON_QUESTION_LIMIT, getAnonSessionId } from "@/lib/auth/session";
import { getOrCreateAnonSession } from "@/lib/db/anonymous-sessions";

export async function GET(req: NextRequest) {
  const sessionId = getAnonSessionId(req);

  if (!sessionId) {
    return NextResponse.json({
      questions_used: 0,
      limit: ANON_QUESTION_LIMIT,
      remaining: ANON_QUESTION_LIMIT,
    });
  }

  const session = await getOrCreateAnonSession(sessionId);
  const remaining = Math.max(0, ANON_QUESTION_LIMIT - session.questions_used);

  return NextResponse.json({
    questions_used: session.questions_used,
    limit: ANON_QUESTION_LIMIT,
    remaining,
  });
}
