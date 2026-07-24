import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { changeAccountPassword } from "@/lib/account-profile";

/** @deprecated Use POST /api/admin/account instead. */
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;
  const { password } = await req.json();
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    await changeAccountPassword(user.id, password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
