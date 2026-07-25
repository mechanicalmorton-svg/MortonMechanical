import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import {
  changeAccountPassword,
  getAccountProfile,
  sendAccountPasswordReset,
  updateAccountProfile,
} from "@/lib/account-profile";
import { sanitizeAuthError } from "@/lib/auth-errors";

function errorJson(err: unknown, fallback: string, status = 400) {
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: sanitizeAuthError(message, fallback) }, { status });
}

export async function GET() {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const profile = await getAccountProfile(user.id, user);
    return NextResponse.json(profile);
  } catch (err) {
    return errorJson(err, "Could not load account.");
  }
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const before = await getAccountProfile(user.id, user);
    const body = await req.json();
    const profile = await updateAccountProfile(user.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
    });
    const { writeAuditEvent, auditContextFromRequest, runWithAuditContext } = await import("@/lib/audit-log");
    await runWithAuditContext(
      auditContextFromRequest(req, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleName: user.roleName,
        avatarUrl: user.avatarUrl,
        kind: "staff",
      }),
      () =>
        writeAuditEvent({
          module: "account",
          action: "profile_updated",
          description: `Account profile updated: ${profile.email}`,
          recordType: "staff",
          recordId: profile.id,
          recordLabel: profile.name,
          oldValue: { name: before.name, email: before.email, phone: before.phone },
          newValue: { name: profile.name, email: profile.email, phone: profile.phone },
          page: "/admin#account",
        }),
    );
    return NextResponse.json(profile);
  } catch (err) {
    return errorJson(err, "Could not update account.");
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "password";
    const { writeAuditEvent, auditContextFromRequest, runWithAuditContext } = await import("@/lib/audit-log");
    const ctx = auditContextFromRequest(req, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleName: user.roleName,
      avatarUrl: user.avatarUrl,
      kind: "staff",
    });

    if (action === "reset-password") {
      const profile = await getAccountProfile(user.id, user);
      await sendAccountPasswordReset(profile.email);
      void runWithAuditContext(ctx, () =>
        writeAuditEvent({
          module: "account",
          action: "password_reset_email",
          description: `Password reset email sent to ${profile.email}`,
          recordType: "staff",
          recordId: profile.id,
          recordLabel: profile.name,
          severity: "notice",
          page: "/admin#account",
        }),
      );
      return NextResponse.json({ ok: true, message: "Password reset email sent." });
    }

    const password = typeof body.password === "string" ? body.password : "";
    const confirm = typeof body.confirm === "string" ? body.confirm : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;

    if (password !== confirm) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    await changeAccountPassword(user.id, password, currentPassword);
    void runWithAuditContext(ctx, () =>
      writeAuditEvent({
        module: "account",
        action: "password_changed",
        description: `Password changed for ${user.email}`,
        recordType: "staff",
        recordId: user.id,
        recordLabel: user.name,
        severity: "notice",
        page: "/admin#account",
        newValue: { password: "[changed]" },
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err, "Could not update password.");
  }
}
