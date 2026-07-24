import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublishableKey, getSupabaseUrl } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresh the session cookie. Avoid getUser()/getClaims() — ES256 tokens without a
  // JWT `kid` fail Auth signature verification on those paths.
  try {
    await supabase.auth.getSession();
  } catch {
    /* session refresh is best-effort; API routes resolve the user via Admin API */
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
