/** Seeded enterprise permission catalog via the registration API. */

import type { PermissionDef, PermissionModuleGroup } from "./catalog-types";
import {
  getRegisteredKeys,
  getRegisteredModules,
  getRegisteredPermission,
  isRegisteredPermissionKey,
  registerModule,
  registerPermission,
} from "./register";

export type { PermissionAction, PermissionDef, PermissionModuleGroup } from "./catalog-types";
export {
  getRegisteredKeys,
  getRegisteredModules,
  registerModule,
  registerPermission,
} from "./register";

function seedCatalog() {
  registerModule({
    id: "dashboard",
    label: "Dashboard",
    description: "Home overview, stats, and widgets",
    tabs: ["dashboard"],
    permissions: [
      { action: "view", label: "View page" },
      { action: "widget.overview", label: "Overview stats", description: "Queued jobs, bookings, urgent, revenue cards" },
      { action: "widget.revenue", label: "Revenue widget" },
      { action: "widget.today_jobs", label: "Today's jobs / schedule" },
      { action: "widget.open_work_orders", label: "Open work orders" },
      { action: "widget.pending_bookings", label: "Pending bookings" },
      { action: "widget.low_stock", label: "Inventory alerts" },
      { action: "widget.quick_actions", label: "Quick actions" },
    ],
  });

  registerModule({
    id: "work_orders",
    label: "Work Orders",
    description: "Jobs and shop floor work",
    tabs: ["work-orders"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
      { action: "assign", label: "Assign technician" },
      { action: "status.change", label: "Change status" },
      { action: "document.edit", label: "Edit documents" },
      { action: "payments.link", label: "Create payment link" },
      { action: "labor.add", label: "Add labor", comingSoon: true },
      { action: "labor.remove", label: "Remove labor", comingSoon: true },
      { action: "parts.add", label: "Add parts", comingSoon: true },
      { action: "parts.remove", label: "Remove parts", comingSoon: true },
      { action: "photos.upload", label: "Upload photos", comingSoon: true },
      { action: "photos.delete", label: "Delete photos", comingSoon: true },
      { action: "print", label: "Print", comingSoon: true },
      { action: "email", label: "Email", comingSoon: true },
      { action: "archive", label: "Archive", comingSoon: true },
      { action: "restore", label: "Restore", comingSoon: true },
      { action: "invoice.generate", label: "Generate invoice", comingSoon: true },
      { action: "pricing.view", label: "View pricing", comingSoon: true },
      { action: "pricing.override", label: "Override pricing", comingSoon: true },
      { action: "cost.view", label: "View cost", comingSoon: true },
      { action: "profit.view", label: "View profit", comingSoon: true },
    ],
  });

  registerModule({
    id: "customers",
    label: "Customers",
    description: "Customer records and vehicles",
    tabs: ["work-orders", "bookings"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
      { action: "field.notes.view", label: "View internal notes", comingSoon: true },
      { action: "field.notes.edit", label: "Edit internal notes", comingSoon: true },
      { action: "column.lifetime_spend", label: "Column: lifetime spend", comingSoon: true },
      { action: "tab.vehicles", label: "Tab: vehicles", comingSoon: true },
    ],
  });

  registerModule({
    id: "bookings",
    label: "Bookings",
    description: "Appointments and schedule",
    tabs: ["bookings"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
    ],
  });

  registerModule({
    id: "quotes",
    label: "Quote Requests",
    description: "Website quote leads",
    tabs: ["quotes"],
    permissions: [
      { action: "view", label: "View" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
    ],
  });

  registerModule({
    id: "inventory",
    label: "Inventory",
    description: "Parts stock and categories",
    tabs: ["inventory-all", "inventory-low"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
      { action: "adjust", label: "Adjust stock / categories" },
    ],
  });

  registerModule({
    id: "fleet",
    label: "Fleet",
    description: "Shop vehicles",
    tabs: ["fleet"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
    ],
  });

  registerModule({
    id: "routes",
    label: "Routes",
    description: "Route planning and today’s stops",
    tabs: ["routes-manager", "routes-today"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
    ],
  });

  registerModule({
    id: "users",
    label: "User Management",
    description: "Staff accounts",
    tabs: ["users"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
      { action: "manage", label: "Manage access" },
    ],
  });

  registerModule({
    id: "roles",
    label: "Roles",
    description: "Role definitions and permission matrix",
    tabs: ["users"],
    permissions: [
      { action: "view", label: "View" },
      { action: "create", label: "Create" },
      { action: "edit", label: "Edit" },
      { action: "delete", label: "Delete" },
    ],
  });

  registerModule({
    id: "content",
    label: "Site Contents",
    description: "Public website content",
    tabs: ["site-contents"],
    permissions: [
      { action: "view", label: "View" },
      { action: "edit", label: "Edit" },
    ],
  });

  registerModule({
    id: "payments",
    label: "Payments",
    description: "Stripe checkout and deposit settings",
    tabs: ["settings", "work-orders"],
    permissions: [
      { action: "view", label: "View" },
      { action: "manage", label: "Manage settings & links" },
    ],
  });

  registerModule({
    id: "audit_logs",
    label: "Audit Logs",
    description: "Immutable activity trail",
    tabs: ["audit-logs"],
    permissions: [
      { action: "view", label: "View" },
      { action: "export", label: "Export" },
    ],
  });

  registerModule({
    id: "settings",
    label: "Settings",
    description: "Account and shop settings modules",
    tabs: ["settings"],
    permissions: [
      { action: "account.view", label: "Own account", description: "Always available to signed-in staff" },
      { action: "company.view", label: "Company settings", comingSoon: true },
      { action: "notifications.view", label: "Notifications", comingSoon: true },
    ],
  });
}

seedCatalog();

/** Live module list from the registry. */
export function getPermissionModules(): PermissionModuleGroup[] {
  return getRegisteredModules();
}

/** @deprecated Prefer getPermissionModules() — kept for existing imports. */
export const PERMISSION_MODULES: PermissionModuleGroup[] = getRegisteredModules();

export function refreshPermissionModulesExport() {
  PERMISSION_MODULES.length = 0;
  PERMISSION_MODULES.push(...getRegisteredModules());
}

export const ALL_PERMISSION_KEYS: string[] = getRegisteredKeys();

export function refreshAllPermissionKeys() {
  ALL_PERMISSION_KEYS.length = 0;
  ALL_PERMISSION_KEYS.push(...getRegisteredKeys());
}

export function isPermissionKey(value: unknown): value is string {
  return isRegisteredPermissionKey(value);
}

export function getPermissionDef(key: string): PermissionDef | undefined {
  return getRegisteredPermission(key);
}

/** When a coarse key is granted, also treat these finer keys as granted (migration). */
export const COARSE_ACTION_EXPANSION: Record<string, string[]> = {
  "dashboard.view": [
    "dashboard.widget.overview",
    "dashboard.widget.revenue",
    "dashboard.widget.today_jobs",
    "dashboard.widget.open_work_orders",
    "dashboard.widget.pending_bookings",
    "dashboard.widget.low_stock",
    "dashboard.widget.quick_actions",
  ],
  "work_orders.edit": [
    "work_orders.assign",
    "work_orders.status.change",
    "work_orders.document.edit",
  ],
  "work_orders.view": ["work_orders.document.edit"],
  "payments.manage": ["work_orders.payments.link"],
};

export function expandCoarseActions(actions: string[]): string[] {
  const next = new Set(actions.filter(isPermissionKey));
  for (const key of [...next]) {
    for (const child of COARSE_ACTION_EXPANSION[key] ?? []) {
      if (isPermissionKey(child)) next.add(child);
    }
  }
  return [...next];
}

/** Map legacy dashboard tab ids → default action grants for migration. */
export const TAB_TO_ACTIONS: Record<string, string[]> = {
  dashboard: expandCoarseActions(["dashboard.view"]),
  "work-orders": expandCoarseActions([
    "work_orders.view",
    "work_orders.create",
    "work_orders.edit",
    "work_orders.delete",
    "customers.view",
    "customers.create",
    "customers.edit",
    "work_orders.payments.link",
  ]),
  bookings: ["bookings.view", "bookings.create", "bookings.edit", "customers.view"],
  quotes: ["quotes.view", "quotes.edit"],
  "inventory-all": ["inventory.view", "inventory.create", "inventory.edit", "inventory.adjust"],
  "inventory-low": ["inventory.view"],
  fleet: ["fleet.view", "fleet.create", "fleet.edit"],
  "routes-manager": ["routes.view", "routes.create", "routes.edit"],
  "routes-today": ["routes.view", "routes.edit"],
  users: ["users.view", "users.create", "users.edit", "users.manage", "roles.view", "roles.edit"],
  "site-contents": ["content.view", "content.edit"],
  "audit-logs": ["audit_logs.view", "audit_logs.export"],
  settings: ["payments.view", "settings.account.view"],
};

/** Derive dashboard tabs that should be visible for a set of action keys. */
export function tabsFromActions(actions: string[]): string[] {
  const tabs = new Set<string>();
  const actionSet = new Set(actions);
  for (const module of getRegisteredModules()) {
    const hasAny = module.permissions.some((permission) => actionSet.has(permission.key));
    if (!hasAny) continue;
    for (const tab of module.tabs) {
      if (tab !== "settings") tabs.add(tab);
    }
  }
  return [...tabs];
}

/** Expand legacy tabs/flags into action keys. Explicit `actions` wins (matrix source of truth). */
export function actionsFromLegacy(input: {
  tabs?: string[];
  actions?: string[];
  manageUsers?: boolean;
  editSiteContent?: boolean;
}): string[] {
  if (Array.isArray(input.actions)) {
    return expandCoarseActions(input.actions.filter(isPermissionKey));
  }

  const next = new Set<string>();
  if (Array.isArray(input.tabs)) {
    for (const tab of input.tabs) {
      for (const key of TAB_TO_ACTIONS[tab] ?? []) next.add(key);
    }
  }
  if (input.manageUsers) {
    for (const key of [
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "users.manage",
      "roles.view",
      "roles.create",
      "roles.edit",
      "roles.delete",
      "audit_logs.view",
      "audit_logs.export",
      "payments.view",
      "payments.manage",
    ]) {
      next.add(key);
    }
  }
  if (input.editSiteContent) {
    next.add("content.view");
    next.add("content.edit");
  }
  return expandCoarseActions([...next]);
}

export function findPermissionDependencyIssues(actions: string[]): { key: string; missing: string[] }[] {
  const set = new Set(actions);
  const issues: { key: string; missing: string[] }[] = [];
  for (const key of actions) {
    const def = getPermissionDef(key);
    if (!def?.dependsOn?.length) continue;
    const missing = def.dependsOn.filter((dep) => !set.has(dep));
    if (missing.length) issues.push({ key, missing });
  }
  return issues;
}
