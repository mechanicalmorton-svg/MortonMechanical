import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { removeAccountAvatar, uploadAccountAvatar } from "@/lib/account-profile";
import { sanitizeAuthError } from "@/lib/auth-errors";

function errorJson(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return NextResponse.json({ error: sanitizeAuthError(message, fallback) }, { status: 400 });
}

export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    const avatarUrl = await uploadAccountAvatar(user.id, file, file.type || "image/jpeg");
    const { writeAuditEvent, auditContextFromHeaders, runWithAuditContext } = await import("@/lib/audit-log");
    const ctx = await auditContextFromHeaders({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleName: user.roleName,
      avatarUrl: user.avatarUrl,
      kind: "staff",
    });
    void runWithAuditContext(ctx, () =>
      writeAuditEvent({
        module: "account",
        action: "avatar_updated",
        description: `Avatar updated for ${user.email}`,
        recordType: "staff",
        recordId: user.id,
        recordLabel: user.name,
        page: "/admin#account",
        newValue: { avatarUrl },
      }),
    );
    return NextResponse.json({ avatarUrl });
  } catch (err) {
    return errorJson(err, "Could not upload photo.");
  }
}

export async function DELETE() {
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  try {
    await removeAccountAvatar(user.id);
    const { writeAuditEvent, auditContextFromHeaders, runWithAuditContext } = await import("@/lib/audit-log");
    const ctx = await auditContextFromHeaders({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleName: user.roleName,
      avatarUrl: user.avatarUrl,
      kind: "staff",
    });
    void runWithAuditContext(ctx, () =>
      writeAuditEvent({
        module: "account",
        action: "avatar_removed",
        description: `Avatar removed for ${user.email}`,
        recordType: "staff",
        recordId: user.id,
        recordLabel: user.name,
        severity: "notice",
        page: "/admin#account",
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorJson(err, "Could not remove photo.");
  }
}
