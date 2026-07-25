import { auditEntityChange, writeAuditEvent } from "./audit-log";
import type { AuditModule, AuditRecordType } from "./audit-types";

export async function auditUpsert(input: {
  module: AuditModule;
  recordType: AuditRecordType;
  recordId: string;
  recordLabel?: string;
  before: unknown | null;
  after: unknown;
  createDescription: string;
  updateDescription: string;
  page?: string;
}) {
  const isCreate = !input.before;
  return auditEntityChange({
    module: input.module,
    action: isCreate ? "created" : "updated",
    description: isCreate ? input.createDescription : input.updateDescription,
    recordType: input.recordType,
    recordId: input.recordId,
    recordLabel: input.recordLabel,
    before: input.before,
    after: input.after,
    page: input.page,
  });
}

export async function auditDelete(input: {
  module: AuditModule;
  recordType: AuditRecordType;
  recordId: string;
  recordLabel?: string;
  before: unknown | null;
  description: string;
  page?: string;
}) {
  return auditEntityChange({
    module: input.module,
    action: "deleted",
    description: input.description,
    recordType: input.recordType,
    recordId: input.recordId,
    recordLabel: input.recordLabel,
    before: input.before,
    after: null,
    severity: "warning",
    page: input.page,
  });
}

export async function auditAuthEvent(input: {
  action: string;
  description: string;
  status?: "success" | "failure" | "denied";
  severity?: "info" | "notice" | "warning" | "critical";
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  actorKind?: "staff" | "client" | "system" | "anonymous";
  metadata?: Record<string, unknown>;
  page?: string;
}) {
  return writeAuditEvent({
    module: "auth",
    action: input.action,
    description: input.description,
    status: input.status ?? "success",
    severity: input.severity ?? (input.status === "failure" || input.status === "denied" ? "warning" : "info"),
    recordType: "session",
    recordId: input.actorUserId || input.actorEmail || "",
    recordLabel: input.actorName || input.actorEmail || "",
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    actorKind: input.actorKind ?? "anonymous",
    page: input.page ?? "/login",
    metadata: input.metadata,
  });
}
