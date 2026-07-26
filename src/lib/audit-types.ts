export type AuditActorKind = "staff" | "client" | "system" | "anonymous";
export type AuditSeverity = "info" | "notice" | "warning" | "critical";
export type AuditStatus = "success" | "failure" | "denied";

export type AuditModule =
  | "auth"
  | "customers"
  | "vehicles"
  | "work-orders"
  | "bookings"
  | "quotes"
  | "inventory"
  | "fleet"
  | "routes"
  | "vehicle-manager"
  | "timeclock"
  | "staff"
  | "roles"
  | "payments"
  | "settings"
  | "content"
  | "account"
  | "system";

export type AuditRecordType =
  | "customer"
  | "customer_vehicle"
  | "work_order"
  | "booking"
  | "quote"
  | "inventory_item"
  | "inventory_category"
  | "fleet_vehicle"
  | "route"
  | "vm_vehicle"
  | "vm_part"
  | "vm_activity"
  | "vm_service_order"
  | "vm_checklist"
  | "time_entry"
  | "staff"
  | "role"
  | "payment"
  | "content"
  | "settings"
  | "session"
  | "";

export type AuditLogEntry = {
  id: string;
  createdAt: string;
  actorUserId?: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actorAvatarUrl?: string;
  actorKind: AuditActorKind;
  module: AuditModule | string;
  page: string;
  action: string;
  description: string;
  severity: AuditSeverity;
  status: AuditStatus;
  recordType: AuditRecordType | string;
  recordId: string;
  recordLabel: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedFields: string[];
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  sessionId: string;
  shopId?: string;
  searchText: string;
  notes: string;
  metadata: Record<string, unknown>;
};

export type WriteAuditEventInput = {
  module: AuditModule | string;
  action: string;
  description: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  page?: string;
  recordType?: AuditRecordType | string;
  recordId?: string;
  recordLabel?: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedFields?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  actorAvatarUrl?: string;
  actorKind?: AuditActorKind;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  sessionId?: string;
  shopId?: string;
};

export const AUDIT_MODULE_OPTIONS: { id: AuditModule; label: string }[] = [
  { id: "auth", label: "Authentication" },
  { id: "customers", label: "Customers" },
  { id: "vehicles", label: "Vehicles" },
  { id: "work-orders", label: "Work Orders" },
  { id: "bookings", label: "Bookings" },
  { id: "quotes", label: "Quotes" },
  { id: "inventory", label: "Inventory" },
  { id: "fleet", label: "Fleet" },
  { id: "routes", label: "Routes" },
  { id: "vehicle-manager", label: "Vehicle Manager" },
  { id: "timeclock", label: "Timeclock" },
  { id: "staff", label: "Staff" },
  { id: "roles", label: "Roles" },
  { id: "payments", label: "Payments" },
  { id: "settings", label: "Settings" },
  { id: "content", label: "Site Content" },
  { id: "account", label: "Account" },
  { id: "system", label: "System" },
];

export const AUDIT_SEVERITY_OPTIONS: AuditSeverity[] = ["info", "notice", "warning", "critical"];
export const AUDIT_SQL = `create table if not exists audit_logs (
  id text primary key,
  created_at timestamptz not null default now(),
  actor_user_id text,
  actor_name text default '',
  actor_email text default '',
  actor_role text default '',
  actor_avatar_url text,
  actor_kind text not null default 'system',
  module text not null,
  page text default '',
  action text not null,
  description text not null default '',
  severity text not null default 'info',
  status text not null default 'success',
  record_type text default '',
  record_id text default '',
  record_label text default '',
  old_value jsonb,
  new_value jsonb,
  changed_fields text[] default '{}',
  ip_address text default '',
  user_agent text default '',
  device text default '',
  browser text default '',
  os text default '',
  session_id text default '',
  shop_id text,
  search_text text not null default '',
  notes text default '',
  metadata jsonb default '{}'::jsonb
);
alter table audit_logs enable row level security;`;
