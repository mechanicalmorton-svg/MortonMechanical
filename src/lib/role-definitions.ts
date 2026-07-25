export const ROLE_COLORS = [
  "sky",
  "violet",
  "slate",
  "emerald",
  "amber",
  "red",
  "fuchsia",
  "cyan",
] as const;

export type RoleColor = (typeof ROLE_COLORS)[number];

export const DASHBOARD_TAB_OPTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "inventory-all", label: "Inventory · All parts" },
  { id: "inventory-low", label: "Inventory · Low stock" },
  { id: "work-orders", label: "Work Orders" },
  { id: "bookings", label: "Bookings" },
  { id: "quotes", label: "Quote Requests" },
  { id: "users", label: "User Management" },
  { id: "fleet", label: "Fleet Management" },
  { id: "routes-manager", label: "Routes · Manager" },
  { id: "routes-today", label: "Routes · My route today" },
  { id: "site-contents", label: "Site Contents" },
] as const;

export type DashboardTabId = (typeof DASHBOARD_TAB_OPTIONS)[number]["id"];

export type RolePermissions = {
  tabs: string[];
  manageUsers: boolean;
  editSiteContent: boolean;
};

export type RoleDefinition = {
  id: string;
  name: string;
  /** Preset key (sky, amber, ...) or custom hex (#RRGGBB). */
  color: string;
  system: boolean;
  permissions: RolePermissions;
  createdAt: string;
  updatedAt: string;
};

export const ROLE_COLOR_CHIP: Record<RoleColor, string> = {
  sky: "admin-glass-chip--sky text-sky-100",
  violet: "admin-glass-chip--violet text-violet-100",
  slate: "admin-glass-chip--slate text-slate-100",
  emerald: "admin-glass-chip--emerald text-emerald-100",
  amber: "admin-glass-chip--amber text-amber-100",
  red: "admin-glass-chip--red text-red-100",
  fuchsia: "admin-glass-chip--fuchsia text-fuchsia-100",
  cyan: "admin-glass-chip--sky text-sky-100",
};

export const ROLE_COLOR_HEX: Record<RoleColor, string> = {
  sky: "#38bdf8",
  violet: "#a78bfa",
  slate: "#94a3b8",
  emerald: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  fuchsia: "#e879f9",
  cyan: "#22d3ee",
};

export function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

export function normalizeRoleColor(value: unknown, fallback = "slate"): string {
  const raw = String(value ?? "").trim();
  if (isRoleColor(raw)) return raw;
  if (isHexColor(raw)) {
    const hex = raw.toLowerCase();
    if (hex.length === 4) {
      const [, r, g, b] = hex;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return hex;
  }
  return fallback;
}

export function resolveRoleColorHex(color: string) {
  const normalized = normalizeRoleColor(color);
  if (isRoleColor(normalized)) return ROLE_COLOR_HEX[normalized];
  return normalized;
}

export function roleChipClassName(color: string) {
  const normalized = normalizeRoleColor(color);
  if (isRoleColor(normalized)) return ROLE_COLOR_CHIP[normalized];
  return "admin-glass-chip--custom text-white";
}

/** Only Founder cannot be deleted. */
export function isProtectedRole(roleId: string) {
  return roleId === "owner";
}

const ALL_TABS = DASHBOARD_TAB_OPTIONS.map((tab) => tab.id);

function nowIso() {
  return new Date().toISOString();
}

export function defaultRoleDefinitions(): RoleDefinition[] {
  const stamp = nowIso();
  return [
    {
      id: "owner",
      name: "Founder",
      color: "sky",
      system: true,
      permissions: { tabs: [...ALL_TABS], manageUsers: true, editSiteContent: true },
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "admin",
      name: "Admin",
      color: "violet",
      system: false,
      permissions: { tabs: [...ALL_TABS], manageUsers: true, editSiteContent: true },
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "mechanic",
      name: "Mechanic",
      color: "slate",
      system: false,
      permissions: {
        tabs: [
          "dashboard",
          "inventory-all",
          "inventory-low",
          "work-orders",
          "bookings",
          "quotes",
          "fleet",
          "routes-manager",
          "routes-today",
        ],
        manageUsers: false,
        editSiteContent: false,
      },
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "dispatcher",
      name: "Dispatcher",
      color: "emerald",
      system: false,
      permissions: {
        tabs: [
          "dashboard",
          "work-orders",
          "bookings",
          "quotes",
          "fleet",
          "routes-manager",
          "routes-today",
        ],
        manageUsers: false,
        editSiteContent: false,
      },
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

export function isRoleColor(value: string): value is RoleColor {
  return (ROLE_COLORS as readonly string[]).includes(value);
}

export function isValidRoleColor(value: string) {
  const normalized = value.trim();
  return isRoleColor(normalized) || isHexColor(normalized);
}

export function slugifyRoleId(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || `role-${Date.now().toString(36)}`;
}

export function normalizeRolePermissions(raw: unknown): RolePermissions {
  const source = raw && typeof raw === "object" ? (raw as Partial<RolePermissions>) : {};
  const tabs = Array.isArray(source.tabs)
    ? source.tabs.filter((tab): tab is string => typeof tab === "string")
    : [];
  const uniqueTabs = [...new Set(tabs.filter((tab) => ALL_TABS.includes(tab as DashboardTabId)))];
  const manageUsers = Boolean(source.manageUsers);
  const editSiteContent = Boolean(source.editSiteContent);
  if (manageUsers && !uniqueTabs.includes("users")) uniqueTabs.push("users");
  if (editSiteContent && !uniqueTabs.includes("site-contents")) uniqueTabs.push("site-contents");
  return {
    tabs: uniqueTabs,
    manageUsers,
    editSiteContent,
  };
}

export function normalizeRoleDefinition(raw: Partial<RoleDefinition> & { id: string; name: string }): RoleDefinition {
  const stamp = nowIso();
  const id = raw.id.trim();
  return {
    id,
    name: raw.name.trim() || raw.id,
    color: normalizeRoleColor(raw.color, id === "owner" ? "sky" : "slate"),
    // Only Founder is permanently protected from deletion.
    system: id === "owner",
    permissions: normalizeRolePermissions(raw.permissions),
    createdAt: raw.createdAt || stamp,
    updatedAt: raw.updatedAt || stamp,
  };
}

export function mergeRoleDefinitions(stored: RoleDefinition[]): RoleDefinition[] {
  const defaults = defaultRoleDefinitions();
  const ownerDefault = defaults.find((role) => role.id === "owner")!;

  // First run: seed all built-in roles.
  if (!stored.length) return defaults;

  const byId = new Map<string, RoleDefinition>();
  for (const role of stored) {
    const normalized = normalizeRoleDefinition(role);
    if (normalized.id === "owner") {
      byId.set("owner", {
        ...ownerDefault,
        name: normalized.name || "Founder",
        color: normalized.color,
        system: true,
        permissions: { tabs: [...ALL_TABS], manageUsers: true, editSiteContent: true },
        createdAt: normalized.createdAt || ownerDefault.createdAt,
        updatedAt: normalized.updatedAt,
      });
      continue;
    }
    byId.set(normalized.id, {
      ...normalized,
      system: false,
    });
  }

  if (!byId.has("owner")) {
    byId.set("owner", ownerDefault);
  }

  const preferredOrder = ["owner", "admin", "mechanic", "dispatcher"];
  const ordered: RoleDefinition[] = [];
  for (const id of preferredOrder) {
    const role = byId.get(id);
    if (role) {
      ordered.push(role);
      byId.delete(id);
    }
  }
  const rest = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return [...ordered, ...rest];
}

export function findRoleDefinition(roles: RoleDefinition[], roleId: string | undefined | null) {
  const id = (roleId || "mechanic").trim() || "mechanic";
  return (
    roles.find((role) => role.id === id) ??
    roles.find((role) => role.id === "mechanic") ??
    roles.find((role) => role.id === "owner") ??
    defaultRoleDefinitions()[0]
  );
}

/** Normalize multi-role ids; fall back to a single `role` for legacy data. */
export function normalizeRoleIds(roleIds?: unknown, fallbackRole?: unknown): string[] {
  const fromArray = Array.isArray(roleIds)
    ? roleIds
        .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
        .map((id) => id.trim())
    : [];
  const unique = [...new Set(fromArray)];
  if (unique.length) return unique;
  const single =
    typeof fallbackRole === "string" && fallbackRole.trim() ? fallbackRole.trim() : "mechanic";
  return [single];
}

/** Primary role for badge color / legacy `role` field: owner, then admin, else first. */
export function pickPrimaryRoleId(roleIds: string[]): string {
  if (roleIds.includes("owner")) return "owner";
  if (roleIds.includes("admin")) return "admin";
  return roleIds[0] || "mechanic";
}

/** Union of tabs/flags across roles — most permissive wins. */
export function combineRolePermissions(definitions: RoleDefinition[]): RolePermissions {
  if (definitions.some((role) => role.id === "owner")) {
    return {
      tabs: [...ALL_TABS],
      manageUsers: true,
      editSiteContent: true,
    };
  }
  const tabs = new Set<string>();
  let manageUsers = false;
  let editSiteContent = false;
  for (const role of definitions) {
    for (const tab of role.permissions.tabs) tabs.add(tab);
    if (role.permissions.manageUsers) manageUsers = true;
    if (role.permissions.editSiteContent) editSiteContent = true;
  }
  return normalizeRolePermissions({
    tabs: [...tabs],
    manageUsers,
    editSiteContent,
  });
}

export type ResolvedUserRoles = {
  roleIds: string[];
  primary: RoleDefinition;
  roles: RoleDefinition[];
  permissions: RolePermissions;
};

export function resolveUserRoles(
  allRoles: RoleDefinition[],
  roleIdsInput?: unknown,
  fallbackRole?: unknown,
): ResolvedUserRoles {
  const roleIds = normalizeRoleIds(roleIdsInput, fallbackRole);
  const seen = new Set<string>();
  const roles: RoleDefinition[] = [];
  for (const id of roleIds) {
    const definition = findRoleDefinition(allRoles, id);
    if (seen.has(definition.id)) continue;
    seen.add(definition.id);
    roles.push(definition);
  }
  const resolvedIds = roles.length ? roles.map((role) => role.id) : ["mechanic"];
  const primary = findRoleDefinition(allRoles, pickPrimaryRoleId(resolvedIds));
  return {
    roleIds: resolvedIds,
    primary,
    roles: roles.length ? roles : [primary],
    permissions: combineRolePermissions(roles.length ? roles : [primary]),
  };
}

export function userHasOwnerRole(user: { role?: string | null; roleIds?: string[] | null }) {
  return user.role === "owner" || Boolean(user.roleIds?.includes("owner"));
}

export function roleCanAccessTab(role: RoleDefinition, tab: string) {
  if (role.id === "owner") return true;
  if (tab === "settings") return true;
  if (tab === "customizer") return role.permissions.editSiteContent || role.permissions.tabs.includes("site-contents");
  return role.permissions.tabs.includes(tab);
}

export function roleCanManageUsers(role: RoleDefinition) {
  return role.id === "owner" || role.permissions.manageUsers;
}

export function roleCanEditSiteContent(role: RoleDefinition) {
  return role.id === "owner" || role.permissions.editSiteContent;
}
