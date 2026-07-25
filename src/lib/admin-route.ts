import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth, requireOwnerOrAdmin, type AuthUser } from "./admin-api";
import { sanitizeAuthError } from "./auth-errors";
import { parseUserAgent, runWithAuditContext, type AuditRequestContext } from "./audit-log";
import { DatabaseError, isDatabaseConfigured } from "./supabase/db";
import { createHash } from "node:crypto";

function sanitizeErrorMessage(message: string) {
  return sanitizeAuthError(message, message);
}

function errorResponse(err: unknown) {
  if (err instanceof DatabaseError) {
    const status = err.message.toLowerCase().includes("not connected") ? 503 : 500;
    return NextResponse.json({ error: sanitizeErrorMessage(err.message) }, { status });
  }
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });
}

function databaseGuard() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not connected. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }
  return null;
}

async function auditContextForUser(user: AuthUser): Promise<AuditRequestContext> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for") || "";
    const ipAddress = forwarded.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    const userAgent = h.get("user-agent") || "";
    const parsed = parseUserAgent(userAgent);
    const cookie = h.get("cookie") || "";
    const sessionSeed = cookie.match(/sb-[^=]+-auth-token/)?.[0] || cookie.slice(0, 64) || user.id;
    const sessionId = createHash("sha256").update(sessionSeed).digest("hex").slice(0, 24);
    return {
      actorUserId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.roleName || user.role,
      actorAvatarUrl: user.avatarUrl,
      actorKind: "staff",
      ipAddress,
      userAgent,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
      sessionId,
    };
  } catch {
    return {
      actorUserId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.roleName || user.role,
      actorAvatarUrl: user.avatarUrl,
      actorKind: "staff",
    };
  }
}

async function runAuthed(user: AuthUser, handler: (user: AuthUser) => Promise<NextResponse>) {
  const dbError = databaseGuard();
  if (dbError) return dbError;
  try {
    const ctx = await auditContextForUser(user);
    return await runWithAuditContext(ctx, () => handler(user));
  } catch (err) {
    console.error("[admin-api]", err);
    return errorResponse(err);
  }
}

export async function withAdminAuth(handler: (user: AuthUser) => Promise<NextResponse>) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return (
      error ??
      NextResponse.json(
        { error: "Could not verify your session for that request. Refresh the page if this keeps happening." },
        { status: 401 },
      )
    );
  }
  return runAuthed(user, handler);
}

export async function withOwnerAdmin(handler: (user: AuthUser) => Promise<NextResponse>) {
  const { user, error } = await requireOwnerOrAdmin();
  if (error || !user) {
    return (
      error ??
      NextResponse.json(
        { error: "Could not verify your session for that request. Refresh the page if this keeps happening." },
        { status: 401 },
      )
    );
  }
  return runAuthed(user, handler);
}
