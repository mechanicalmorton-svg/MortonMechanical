import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, isSetupComplete, login, logout, setupAdmin } from "@/lib/auth";
import { createAuthServerClient, isAllowedAdminEmail } from "@/lib/supabase/server-auth";
import { isSupabaseAuthConfigured } from "@/lib/supabase/server";

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

    const supabase = await createAuthServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Auth is not configured." }, { status: 500 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email) {
      const message =
        error?.message?.includes("JWT") || error?.message?.includes("kid")
          ? "Sign-in failed due to an auth configuration issue. Try again, or contact support if it persists."
          : "Wrong email or password.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        username: data.user.email.split("@")[0],
        email: data.user.email,
      },
    });
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
    const supabase = await createAuthServerClient();
    if (supabase) await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (token) await logout(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
