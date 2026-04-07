import { decodeJwt } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { ANON_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

// Paths accessible only when NOT authenticated
const AUTH_ONLY_PATHS = ["/login", "/signup"];

function isTokenValid(token: string): boolean {
  try {
    const { exp } = decodeJwt(token);
    return typeof exp === "number" && exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const isAuthenticated = sessionToken ? isTokenValid(sessionToken) : false;

  const res = NextResponse.next();

  // Clear stale/expired session cookie so auth pages stay accessible
  if (sessionToken && !isAuthenticated) {
    res.cookies.delete(SESSION_COOKIE);
  }

  // Inject anonymous session cookie if not present
  if (!req.cookies.get(ANON_SESSION_COOKIE)) {
    res.cookies.set(ANON_SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: false, // readable by client JS for header injection
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|public).*)",
  ],
};
