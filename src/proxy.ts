import { NextResponse, type NextRequest } from "next/server";

/**
 * Intentionally minimal. Calling supabase.auth.getSession()/getUser() here can
 * re-verify ES256 access tokens that lack a `kid` and wipe/break the session.
 * Auth is resolved inside route handlers / server components instead.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/mechanic/:path*",
    "/dispatcher/:path*",
  ],
};
