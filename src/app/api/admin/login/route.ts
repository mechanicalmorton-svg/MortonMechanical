import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, isSetupComplete, login, logout, setupAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();

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
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (token) await logout(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
