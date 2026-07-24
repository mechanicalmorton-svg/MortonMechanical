import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import {
  changeAccountPassword,
  getAccountProfile,
  sendAccountPasswordReset,
  updateAccountProfile,
} from "@/lib/account-profile";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const profile = await getAccountProfile(user.id, user);
    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not load account." }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const body = await req.json();
    const profile = await updateAccountProfile(user.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
    });
    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update account." }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "password";

    if (action === "reset-password") {
      const profile = await getAccountProfile(user.id, user);
      await sendAccountPasswordReset(profile.email);
      return NextResponse.json({ ok: true, message: "Password reset email sent." });
    }

    const password = typeof body.password === "string" ? body.password : "";
    const confirm = typeof body.confirm === "string" ? body.confirm : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;

    if (password !== confirm) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    await changeAccountPassword(user.id, password, currentPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update password." }, { status: 400 });
  }
}
