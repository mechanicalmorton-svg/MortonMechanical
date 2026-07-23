import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { updatePassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;
  try {
    const { password } = await req.json();
    await updatePassword(user.id, password ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 400 });
  }
}
