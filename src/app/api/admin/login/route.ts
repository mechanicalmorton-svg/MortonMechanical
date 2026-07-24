import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_COOKIE, isSetupComplete, login, logout, setupAdmin } from "@/lib/auth";
import { isAllowedAdminEmail } from "@/lib/supabase/server-auth";
import { getPublishableKey, getSupabaseUrl, isSupabaseAuthConfigured } from "@/lib/supabase/server";
import { isJwtKeyError, sanitizeAuthError } from "@/lib/auth-errors";

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function isAuthTokenCookie(name: string) {
  return /^(sb-.*-auth-token)(?:\.\d+)?$/.test(name) || name === AUTH_COOKIE;
}

export async function POST(req: Request) {
  const body = await req.json();

  if (isSupabaseAuthConfigured()) {
    const email = (body.email ?? body.username ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!isAllowedAdminEmail(email)) {
      return NextResponse.json(
        { error: "Only @mortonsmechanical.com accounts can access this portal." },
        { status: 403 },
      );
    }

    const url = getSupabaseUrl();
    const key = getPublishableKey();
    if (!url || !key) {
      return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
    }

    const cookieStore = await cookies();
    const pendingCookies: PendingCookie[] = [];

    // Clear stale auth cookies so an old ES256 token without `kid` is not sent as Authorization.
    for (const cookie of cookieStore.getAll()) {
      if (!isAuthTokenCookie(cookie.name)) continue;
      const clear = { path: "/", maxAge: 0 } as const;
      pendingCookies.push({ name: cookie.name, value: "", options: clear });
      try {
        cookieStore.set(cookie.name, "", clear);
      } catch {
        /* ignore */
      }
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        // Empty during sign-in so no unverifiable leftover JWT is attached.
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
            try {
              cookieStore.set(name, value, options);
            } catch {
              /* cookie store may be read-only in some runtimes */
            }
          });
        },
      },
    });

    // signInWithPassword persists the session via setAll — do not call setSession/getUser
    // (ES256 tokens without a JWT `kid` fail those verification paths).
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email || !data.session) {
      const message = isJwtKeyError(error?.message)
        ? sanitizeAuthError(error?.message, "Sign-in failed due to an auth configuration issue.")
        : "Wrong email or password.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        username: data.user.email.split("@")[0],
        email: data.user.email,
      },
    });

    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }

    return response;
  }

  if (body.action === "setup") {
    if (await isSetupComplete()) {
      return NextResponse.json({ error: "Setup already completed." }, { status: 400 });
    }
    try {
      await setupAdmin(body.username ?? "", body.password ?? "");
      const result = await login(body.username, body.password);
      if (!result) return NextResponse.json({ error: "Setup failed." }, { status: 500 });
      const res = NextResponse.json({ user: result.user });
      res.cookies.set(AUTH_COOKIE, result.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return res;
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Setup failed." }, { status: 400 });
    }
  }

  const result = await login(body.username ?? "", body.password ?? "");
  if (!result) return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });

  const res = NextResponse.json({ user: result.user });
  res.cookies.set(AUTH_COOKIE, result.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}

export async function DELETE() {
  if (isSupabaseAuthConfigured()) {
    const cookieStore = await cookies();
    const pendingCookies: PendingCookie[] = [];
    const url = getSupabaseUrl();
    const key = getPublishableKey();

    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options });
              try {
                cookieStore.set(name, value, options);
              } catch {
                /* ignore */
              }
            });
          },
        },
      });
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* clear cookies below even if signOut fails */
      }
    }

    // Always clear auth cookies on logout.
    for (const cookie of cookieStore.getAll()) {
      if (!isAuthTokenCookie(cookie.name)) continue;
      pendingCookies.push({ name: cookie.name, value: "", options: { path: "/", maxAge: 0 } });
    }

    const response = NextResponse.json({ ok: true });
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (token) await logout(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
