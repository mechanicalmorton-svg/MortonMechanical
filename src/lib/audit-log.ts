import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { newId } from "./store";
import { isDatabaseConfigured, requireAdminClient } from "./supabase/db";
import type {
  AuditActorKind,
  AuditLogEntry,
  AuditSeverity,
  AuditStatus,
  WriteAuditEventInput,
} from "./audit-types";

export type AuditRequestContext = {
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  actorAvatarUrl?: string;
  actorKind?: AuditActorKind;
  page?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  sessionId?: string;
  shopId?: string;
};

const auditAls = new AsyncLocalStorage<AuditRequestContext>();

export function runWithAuditContext<T>(ctx: AuditRequestContext, fn: () => Promise<T>): Promise<T> {
  return auditAls.run(ctx, fn);
}

export function getAuditContext(): AuditRequestContext | undefined {
  return auditAls.getStore();
}

export function parseUserAgent(ua: string) {
  const value = ua || "";
  let browser = "Unknown";
  if (/Edg\//i.test(value)) browser = "Edge";
  else if (/Chrome\//i.test(value) && !/Edg\//i.test(value)) browser = "Chrome";
  else if (/Firefox\//i.test(value)) browser = "Firefox";
  else if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) browser = "Safari";

  let os = "Unknown";
  if (/Windows/i.test(value)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(value)) os = "macOS";
  else if (/Android/i.test(value)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(value)) os = "iOS";
  else if (/Linux/i.test(value)) os = "Linux";

  let device = "Desktop";
  if (/Mobile|Android|iPhone/i.test(value)) device = "Mobile";
  else if (/iPad|Tablet/i.test(value)) device = "Tablet";

  return { browser, os, device };
}

type AuditActorHint = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  roleName?: string;
  avatarUrl?: string;
  kind?: AuditActorKind;
};

function auditContextFromHeaderBag(
  get: (name: string) => string | null,
  actor?: AuditActorHint,
): AuditRequestContext {
  const forwarded = get("x-forwarded-for") || "";
  const ipAddress = forwarded.split(",")[0]?.trim() || get("x-real-ip") || "";
  const userAgent = get("user-agent") || "";
  const parsed = parseUserAgent(userAgent);
  const cookie = get("cookie") || "";
  const sessionSeed = cookie.match(/sb-[^=]+-auth-token/)?.[0] || cookie.slice(0, 64) || ipAddress || "anon";
  const sessionId = createHash("sha256").update(sessionSeed).digest("hex").slice(0, 24);

  return {
    actorUserId: actor?.id,
    actorName: actor?.name,
    actorEmail: actor?.email,
    actorRole: actor?.roleName || actor?.role,
    actorAvatarUrl: actor?.avatarUrl,
    actorKind: actor?.kind ?? (actor?.id ? "staff" : "anonymous"),
    ipAddress,
    userAgent,
    device: parsed.device,
    browser: parsed.browser,
    os: parsed.os,
    sessionId,
  };
}

export function auditContextFromRequest(req: Request, actor?: AuditActorHint): AuditRequestContext {
  return auditContextFromHeaderBag((name) => req.headers.get(name), actor);
}

/** Build audit context from Next.js `headers()` when no Request is available. */
export async function auditContextFromHeaders(actor?: AuditActorHint): Promise<AuditRequestContext> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return auditContextFromHeaderBag((name) => h.get(name), actor);
  } catch {
    return {
      actorUserId: actor?.id,
      actorName: actor?.name,
      actorEmail: actor?.email,
      actorRole: actor?.roleName || actor?.role,
      actorAvatarUrl: actor?.avatarUrl,
      actorKind: actor?.kind ?? (actor?.id ? "staff" : "anonymous"),
    };
  }
}

export function diffObjects(before: unknown, after: unknown) {
  const beforeObj =
    before && typeof before === "object" && !Array.isArray(before)
      ? (before as Record<string, unknown>)
      : null;
  const afterObj =
    after && typeof after === "object" && !Array.isArray(after)
      ? (after as Record<string, unknown>)
      : null;

  if (!beforeObj && !afterObj) {
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    return {
      oldValue: before ?? null,
      newValue: after ?? null,
      changedFields: changed ? ["value"] : ([] as string[]),
    };
  }

  const keys = new Set([...Object.keys(beforeObj ?? {}), ...Object.keys(afterObj ?? {})]);
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  const changedFields: string[] = [];

  for (const key of keys) {
    const a = beforeObj?.[key];
    const b = afterObj?.[key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    changedFields.push(key);
    oldValue[key] = a ?? null;
    newValue[key] = b ?? null;
  }

  return { oldValue, newValue, changedFields };
}

function buildSearchText(parts: Array<string | undefined | null>) {
  return parts
    .filter((part): part is string => Boolean(part && String(part).trim()))
    .join(" ")
    .toLowerCase()
    .slice(0, 4000);
}

function toRow(entry: AuditLogEntry) {
  return {
    id: entry.id,
    created_at: entry.createdAt,
    actor_user_id: entry.actorUserId ?? null,
    actor_name: entry.actorName,
    actor_email: entry.actorEmail,
    actor_role: entry.actorRole,
    actor_avatar_url: entry.actorAvatarUrl ?? null,
    actor_kind: entry.actorKind,
    module: entry.module,
    page: entry.page,
    action: entry.action,
    description: entry.description,
    severity: entry.severity,
    status: entry.status,
    record_type: entry.recordType,
    record_id: entry.recordId,
    record_label: entry.recordLabel,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
    changed_fields: entry.changedFields,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    device: entry.device,
    browser: entry.browser,
    os: entry.os,
    session_id: entry.sessionId,
    shop_id: entry.shopId ?? null,
    search_text: entry.searchText,
    notes: entry.notes,
    metadata: entry.metadata,
  };
}

export function rowToAuditLog(r: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(r.id ?? ""),
    createdAt: String(r.created_at ?? ""),
    actorUserId: (r.actor_user_id as string) || undefined,
    actorName: String(r.actor_name ?? ""),
    actorEmail: String(r.actor_email ?? ""),
    actorRole: String(r.actor_role ?? ""),
    actorAvatarUrl: (r.actor_avatar_url as string) || undefined,
    actorKind: (r.actor_kind as AuditActorKind) || "system",
    module: String(r.module ?? ""),
    page: String(r.page ?? ""),
    action: String(r.action ?? ""),
    description: String(r.description ?? ""),
    severity: (r.severity as AuditSeverity) || "info",
    status: (r.status as AuditStatus) || "success",
    recordType: String(r.record_type ?? ""),
    recordId: String(r.record_id ?? ""),
    recordLabel: String(r.record_label ?? ""),
    oldValue: r.old_value ?? undefined,
    newValue: r.new_value ?? undefined,
    changedFields: Array.isArray(r.changed_fields) ? (r.changed_fields as string[]) : [],
    ipAddress: String(r.ip_address ?? ""),
    userAgent: String(r.user_agent ?? ""),
    device: String(r.device ?? ""),
    browser: String(r.browser ?? ""),
    os: String(r.os ?? ""),
    sessionId: String(r.session_id ?? ""),
    shopId: (r.shop_id as string) || undefined,
    searchText: String(r.search_text ?? ""),
    notes: String(r.notes ?? ""),
    metadata:
      r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
        ? (r.metadata as Record<string, unknown>)
        : {},
  };
}

export function isMissingAuditLogsTable(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("audit_logs") &&
    (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find"))
  );
}

/** Append-only audit write. Never throws to callers. */
export async function writeAuditEvent(input: WriteAuditEventInput): Promise<string | null> {
  try {
    const ctx = getAuditContext() ?? {};
    const diff =
      input.changedFields && input.changedFields.length
        ? {
            oldValue: input.oldValue ?? null,
            newValue: input.newValue ?? null,
            changedFields: input.changedFields,
          }
        : input.oldValue !== undefined || input.newValue !== undefined
          ? diffObjects(input.oldValue, input.newValue)
          : { oldValue: input.oldValue, newValue: input.newValue, changedFields: [] as string[] };

    const entry: AuditLogEntry = {
      id: newId(),
      createdAt: new Date().toISOString(),
      actorUserId: input.actorUserId ?? ctx.actorUserId,
      actorName: input.actorName ?? ctx.actorName ?? "",
      actorEmail: input.actorEmail ?? ctx.actorEmail ?? "",
      actorRole: input.actorRole ?? ctx.actorRole ?? "",
      actorAvatarUrl: input.actorAvatarUrl ?? ctx.actorAvatarUrl,
      actorKind: input.actorKind ?? ctx.actorKind ?? "system",
      module: input.module,
      page: input.page ?? ctx.page ?? "",
      action: input.action,
      description: input.description,
      severity: input.severity ?? "info",
      status: input.status ?? "success",
      recordType: input.recordType ?? "",
      recordId: input.recordId ?? "",
      recordLabel: input.recordLabel ?? "",
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      changedFields: diff.changedFields,
      ipAddress: input.ipAddress ?? ctx.ipAddress ?? "",
      userAgent: input.userAgent ?? ctx.userAgent ?? "",
      device: input.device ?? ctx.device ?? "",
      browser: input.browser ?? ctx.browser ?? "",
      os: input.os ?? ctx.os ?? "",
      sessionId: input.sessionId ?? ctx.sessionId ?? "",
      shopId: input.shopId ?? ctx.shopId,
      searchText: "",
      notes: input.notes ?? "",
      metadata: input.metadata ?? {},
    };

    entry.searchText = buildSearchText([
      entry.id,
      entry.actorName,
      entry.actorEmail,
      entry.actorRole,
      entry.module,
      entry.action,
      entry.description,
      entry.recordType,
      entry.recordId,
      entry.recordLabel,
      entry.ipAddress,
      entry.browser,
      entry.os,
      entry.device,
      entry.changedFields.join(" "),
      JSON.stringify(entry.oldValue ?? ""),
      JSON.stringify(entry.newValue ?? ""),
    ]);

    if (!isDatabaseConfigured()) {
      console.warn("[audit] database not configured; event dropped", entry.action);
      return null;
    }

    const { error } = await requireAdminClient().from("audit_logs").insert(toRow(entry));
    if (error) {
      if (isMissingAuditLogsTable(error.message)) {
        console.warn("[audit] audit_logs table missing — run supabase/add-audit-logs.sql");
      } else {
        console.error("[audit] failed to write event", error.message);
      }
      return null;
    }
    return entry.id;
  } catch (err) {
    console.error("[audit] unexpected write failure", err);
    return null;
  }
}

export async function auditEntityChange(input: {
  module: WriteAuditEventInput["module"];
  action: string;
  description: string;
  recordType: WriteAuditEventInput["recordType"];
  recordId: string;
  recordLabel?: string;
  before?: unknown;
  after?: unknown;
  severity?: AuditSeverity;
  status?: AuditStatus;
  page?: string;
  metadata?: Record<string, unknown>;
}) {
  const diff = diffObjects(input.before ?? null, input.after ?? null);
  const isCreate = !input.before && Boolean(input.after);
  const isDelete = Boolean(input.before) && !input.after;
  const action =
    input.action ||
    (isCreate ? "created" : isDelete ? "deleted" : diff.changedFields.length ? "updated" : "touched");

  return writeAuditEvent({
    module: input.module,
    action,
    description: input.description,
    recordType: input.recordType,
    recordId: input.recordId,
    recordLabel: input.recordLabel,
    oldValue: diff.oldValue,
    newValue: diff.newValue,
    changedFields: diff.changedFields,
    severity: input.severity ?? (isDelete ? "warning" : "info"),
    status: input.status ?? "success",
    page: input.page,
    metadata: input.metadata,
  });
}
