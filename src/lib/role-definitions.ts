import { actionsFromLegacy, tabsFromActions } from "./permissions/catalog";
import { getRegisteredKeys } from "./permissions/register";

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
  { id: "vehicle-manager", label: "Vehicle Manager · Vehicles" },
  { id: "vehicle-checklists", label: "Vehicle Manager · Checklists" },
  { id: "routes-manager", label: "Routes · Manager" },
  { id: "routes-today", label: "Routes · My route today" },
  { id: "timesheets", label: "Timesheets" },
  { id: "site-contents", label: "Site Contents" },
  { id: "audit-logs", label: "Audit Logs" },
] as const;

export type DashboardTabId = (typeof DASHBOARD_TAB_OPTIONS)[number]["id"];

export type PermissionPage = {
  id: DashboardTabId;
  label: string;
  description?: string;
};

export type PermissionPageGroup = {
  id: string;
  label: string;
  description: string;
  /** When true, UI shows a section select-all control. */
  selectableAll?: boolean;
  pages: PermissionPage[];
};

/** Grouped catalog for the User Management role editor (mirrors sidebar structure). */
export const PERMISSION_PAGE_GROUPS: PermissionPageGroup[] = [
  {
    id: "operations",
    label: "Operations",
    description: "Day-to-day shop floor and front desk pages",
    pages: [
      { id: "dashboard", label: "Dashboard", description: "Overview, stats, and quick actions" },
      { id: "work-orders", label: "Work Orders", description: "Create and manage jobs" },
      { id: "bookings", label: "Bookings", description: "Appointments and schedule" },
      { id: "quotes", label: "Quote Requests", description: "Incoming website quote leads" },
      { id: "timesheets", label: "Timesheets", description: "Review and edit staff clock in/out" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Parts stock and low-stock alerts",
    selectableAll: true,
    pages: [
      { id: "inventory-all", label: "All parts", description: "Full inventory catalog" },
      { id: "inventory-low", label: "Low stock", description: "Items at or below minimum" },
    ],
  },
  {
    id: "fleet-routes",
    label: "Fleet & Routes",
    description: "Vehicles on the road and daily routes",
    selectableAll: true,
    pages: [
      { id: "fleet", label: "Fleet Management", description: "Shop vehicles and status" },
      { id: "routes-manager", label: "Route manager", description: "Plan and assign routes" },
      { id: "routes-today", label: "My route today", description: "Assigned stops for today" },
    ],
  },
  {
    id: "vehicle-manager",
    label: "Vehicle Manager",
    description: "PM vehicles, service history, and checklists",
    selectableAll: true,
    pages: [
      { id: "vehicle-manager", label: "Vehicles", description: "Vehicle list, parts, activities, and service" },
      { id: "vehicle-checklists", label: "Checklists", description: "Vehicle completion checklists" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    description: "Sensitive shop admin pages",
    pages: [
      { id: "users", label: "User Management", description: "Staff accounts and roles" },
      { id: "site-contents", label: "Site Contents", description: "Public website content" },
      { id: "audit-logs", label: "Audit Logs", description: "Who changed what and when" },
    ],
  },
];

export function dashboardTabLabel(tabId: string) {
  const fromGroups = PERMISSION_PAGE_GROUPS.flatMap((group) => group.pages).find((page) => page.id === tabId);
  if (fromGroups) return fromGroups.label;
  const fromOptions = DASHBOARD_TAB_OPTIONS.find((tab) => tab.id === tabId);
  return fromOptions?.label ?? tabId;
}

export function toggleTabsInSet(current: string[], tabIds: string[], enabled: boolean) {
  const next = new Set(current);
  for (const id of tabIds) {
    if (enabled) next.add(id);
    else next.delete(id);
  }
  return [...next];
}

export type RolePermissions = {
  tabs: string[];
  /** Seeded permission keys (e.g. work_orders.edit). */
  actions: string[];
  manageUsers: boolean;
  editSiteContent: boolean;
  /** Optional role builder metadata. */
  description?: string;
  /** Soft-archived — hidden from role assignment pickers. */
  archived?: boolean;
  /** Display order on the roles grid (not an access grant). */
  sortOrder?: number;
};

/** Optional badge look overrides (stored with the role; omit = theme defaults). */
export type RoleColorStyle = {
  text?: string;
  border?: string;
  glow?: string;
  hover?: string;
  /** When true, apply a glow using `glow` (or the base color). */
  glowEnabled?: boolean;
};

export type RoleDefinition = {
  id: string;
  name: string;
  /** Preset key (sky, amber, ...) or custom hex (#RRGGBB). */
  color: string;
  /** Advanced badge styling (text / border / glow / hover). */
  colorStyle?: RoleColorStyle;
  system: boolean;
  permissions: RolePermissions;
  createdAt: string;
  updatedAt: string;
};

export const ROLE_COLOR_CHIP: Record<RoleColor, string> = {
  sky: "admin-glass-chip--sky text-sky-50",
  violet: "admin-glass-chip--violet text-violet-50",
  slate: "admin-glass-chip--slate text-slate-50",
  emerald: "admin-glass-chip--emerald text-emerald-50",
  amber: "admin-glass-chip--amber text-amber-50",
  red: "admin-glass-chip--red text-red-50",
  fuchsia: "admin-glass-chip--fuchsia text-fuchsia-50",
  cyan: "admin-glass-chip--cyan text-cyan-50",
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

export function normalizeOptionalHex(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (!isHexColor(withHash)) return undefined;
  return normalizeRoleColor(withHash);
}

export function normalizeRoleColorStyle(raw: unknown): RoleColorStyle | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const next: RoleColorStyle = {};
  const text = normalizeOptionalHex(source.text);
  const border = normalizeOptionalHex(source.border);
  const glow = normalizeOptionalHex(source.glow);
  const hover = normalizeOptionalHex(source.hover);
  if (text) next.text = text;
  if (border) next.border = border;
  if (glow) next.glow = glow;
  if (hover) next.hover = hover;
  if (source.glowEnabled === true) next.glowEnabled = true;
  if (source.glowEnabled === false) next.glowEnabled = false;
  if (!Object.keys(next).length) return undefined;
  return next;
}

export function roleHasCustomStyle(style?: RoleColorStyle | null) {
  return Boolean(
    style &&
      (style.text ||
        style.border ||
        style.glow ||
        style.hover ||
        style.glowEnabled === true ||
        style.glowEnabled === false),
  );
}

export type ResolvedRoleAppearance = {
  base: string;
  text: string;
  border: string;
  glow: string;
  hover: string;
  glowEnabled: boolean;
  useInline: boolean;
};

export function resolveRoleAppearance(
  color: string,
  style?: RoleColorStyle | null,
): ResolvedRoleAppearance {
  const base = resolveRoleColorHex(color);
  const normalized = normalizeRoleColor(color);
  const customBase = isHexColor(normalized);
  const glowEnabled = style?.glowEnabled === true || Boolean(style?.glow);
  return {
    base,
    text: style?.text || "#ffffff",
    border: style?.border || base,
    glow: style?.glow || base,
    hover: style?.hover || base,
    glowEnabled,
    useInline: customBase || roleHasCustomStyle(style),
  };
}

/** Inline styles for role chips/badges when using custom hex or style overrides. */
export function buildRoleChipStyle(
  color: string,
  style?: RoleColorStyle | null,
): Record<string, string> | undefined {
  const appearance = resolveRoleAppearance(color, style);
  if (!appearance.useInline) return undefined;

  const { base, text, border, glow, hover, glowEnabled } = appearance;
  const customBase = isHexColor(normalizeRoleColor(color));
  const shadow = glowEnabled
    ? `0 1px 0 rgba(255,255,255,0.16) inset, 0 0 0 1px ${border}33, 0 4px 14px ${glow}40, 0 0 20px ${glow}55`
    : `0 1px 0 rgba(255,255,255,0.16) inset, 0 0 0 1px ${border}22, 0 4px 14px ${base}28`;

  return {
    ...(style?.text || customBase ? { color: style?.text || text } : {}),
    background: `linear-gradient(145deg, rgba(255,255,255,0.16) 0%, transparent 42%), linear-gradient(180deg, ${base}88, ${base}28)`,
    borderColor: `${border}aa`,
    boxShadow: shadow,
    "--role-hover": hover,
    "--role-glow": glow,
    "--role-border": border,
  };
}

/** Only Founder cannot be deleted. */
export function isProtectedRole(roleId: string) {
  return roleId === "owner";
}

/** Founder + secret Founder (Platform Architect). */
export const FULL_ACCESS_ROLE_IDS = ["owner", "platform-architect"] as const;

/** Always full portal access even without Founder / Platform Architect assigned. */
export const BREAK_GLASS_ADMIN_EMAILS = [
  "adean@mortonsmechanical.com",
  "kstroud@mortonsmechanical.com",
] as const;

export function isBreakGlassAdminEmail(email?: string | null) {
  if (!email) return false;
  return (BREAK_GLASS_ADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}

export function isFullAccessRoleId(roleId: string) {
  return (FULL_ACCESS_ROLE_IDS as readonly string[]).includes(roleId);
}

/** Platform Architect (by id or display name) acts as a secret Founder. */
export function isSecretFounderRole(role: { id: string; name?: string | null }) {
  if (isFullAccessRoleId(role.id)) return true;
  return String(role.name ?? "").trim().toLowerCase() === "platform architect";
}

const ALL_TABS = DASHBOARD_TAB_OPTIONS.map((tab) => tab.id);

function nowIso() {
  return new Date().toISOString();
}

function permissionsWithActions(partial: Omit<RolePermissions, "actions"> & { actions?: string[] }): RolePermissions {
  return normalizeRolePermissions(partial);
}

export function defaultRoleDefinitions(): RoleDefinition[] {
  const stamp = nowIso();
  return [
    {
      id: "owner",
      name: "Founder",
      color: "sky",
      system: true,
      permissions: permissionsWithActions({
        tabs: [...ALL_TABS],
        actions: [...getRegisteredKeys()],
        manageUsers: true,
        editSiteContent: true,
        sortOrder: 0,
      }),
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "admin",
      name: "Admin",
      color: "violet",
      system: false,
      permissions: permissionsWithActions({
        tabs: [...ALL_TABS],
        actions: [...getRegisteredKeys()],
        manageUsers: true,
        editSiteContent: true,
        sortOrder: 10,
      }),
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "mechanic",
      name: "Mechanic",
      color: "slate",
      system: false,
      permissions: permissionsWithActions({
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
        actions: [
          ...actionsFromLegacy({
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
          }),
          "dashboard.widget.timeclock",
          "timeclock.view",
          "timeclock.clock",
        ],
        manageUsers: false,
        editSiteContent: false,
        sortOrder: 20,
      }),
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: "dispatcher",
      name: "Dispatcher",
      color: "emerald",
      system: false,
      permissions: permissionsWithActions({
        tabs: [
          "dashboard",
          "work-orders",
          "bookings",
          "quotes",
          "fleet",
          "routes-manager",
          "routes-today",
        ],
        actions: [
          ...actionsFromLegacy({
            tabs: [
              "dashboard",
              "work-orders",
              "bookings",
              "quotes",
              "fleet",
              "routes-manager",
              "routes-today",
            ],
          }),
          "dashboard.widget.timeclock",
          "timeclock.view",
          "timeclock.clock",
        ],
        manageUsers: false,
        editSiteContent: false,
        sortOrder: 30,
      }),
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
  const manageUsers = Boolean(source.manageUsers);
  const editSiteContent = Boolean(source.editSiteContent);
  const actions = actionsFromLegacy({
    tabs,
    actions: source.actions,
    manageUsers,
    editSiteContent,
  });
  const derivedTabs = tabsFromActions(actions);
  const uniqueTabs = [
    ...new Set(
      [...tabs, ...derivedTabs].filter((tab) => ALL_TABS.includes(tab as DashboardTabId)),
    ),
  ];
  const effectiveManageUsers =
    manageUsers || actions.some((key) => key.startsWith("users.") || key.startsWith("roles."));
  const effectiveEditSiteContent = editSiteContent || actions.includes("content.edit");
  if (effectiveManageUsers && !uniqueTabs.includes("users")) uniqueTabs.push("users");
  if (effectiveEditSiteContent && !uniqueTabs.includes("site-contents")) uniqueTabs.push("site-contents");
  if (actions.includes("audit_logs.view") && !uniqueTabs.includes("audit-logs")) uniqueTabs.push("audit-logs");
  if (
    actions.includes("timeclock.workspace.timesheets") &&
    !uniqueTabs.includes("timesheets")
  ) {
    uniqueTabs.push("timesheets");
  }
  const sortOrder =
    typeof source.sortOrder === "number" && Number.isFinite(source.sortOrder)
      ? source.sortOrder
      : undefined;
  return {
    tabs: uniqueTabs,
    actions,
    manageUsers: effectiveManageUsers,
    editSiteContent: effectiveEditSiteContent,
    description: typeof source.description === "string" ? source.description : undefined,
    archived: Boolean(source.archived),
    ...(sortOrder != null ? { sortOrder } : {}),
  };
}

export function normalizeRoleDefinition(raw: Partial<RoleDefinition> & { id: string; name: string }): RoleDefinition {
  const stamp = nowIso();
  const id = raw.id.trim();
  const permissionsRaw =
    raw.permissions && typeof raw.permissions === "object"
      ? (raw.permissions as RolePermissions & { colorStyle?: unknown })
      : undefined;
  const colorStyle =
    normalizeRoleColorStyle(raw.colorStyle) ??
    normalizeRoleColorStyle(permissionsRaw?.colorStyle);
  const permissions = normalizeRolePermissions(permissionsRaw);
  return {
    id,
    name: raw.name.trim() || raw.id,
    color: normalizeRoleColor(raw.color, id === "owner" ? "sky" : "slate"),
    ...(colorStyle ? { colorStyle } : {}),
    // Only Founder is permanently protected from deletion.
    system: id === "owner",
    permissions,
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
        colorStyle: normalized.colorStyle,
        system: true,
        permissions: permissionsWithActions({
          tabs: [...ALL_TABS],
          actions: [...getRegisteredKeys()],
          manageUsers: true,
          editSiteContent: true,
          description: normalized.permissions.description,
          sortOrder: normalized.permissions.sortOrder ?? ownerDefault.permissions.sortOrder,
        }),
        createdAt: normalized.createdAt || ownerDefault.createdAt,
        updatedAt: normalized.updatedAt,
      });
      continue;
    }
    // Built-in floor staff roles always get punch access (Founder can still revoke in Access Control).
    if (normalized.id === "mechanic" || normalized.id === "dispatcher") {
      const punchKeys = ["dashboard.widget.timeclock", "timeclock.view", "timeclock.clock"];
      const actions = new Set(normalized.permissions.actions ?? []);
      for (const key of punchKeys) actions.add(key);
      byId.set(normalized.id, {
        ...normalized,
        system: false,
        permissions: {
          ...normalized.permissions,
          actions: [...actions],
        },
      });
      continue;
    }

    // Platform Architect = secret Founder (always full access keys).
    if (isSecretFounderRole(normalized) && normalized.id !== "owner") {
      byId.set(normalized.id, {
        ...normalized,
        system: false,
        permissions: permissionsWithActions({
          tabs: [...ALL_TABS],
          actions: [...getRegisteredKeys()],
          manageUsers: true,
          editSiteContent: true,
          description: normalized.permissions.description,
          archived: normalized.permissions.archived,
          sortOrder: normalized.permissions.sortOrder,
        }),
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

  const all = [...byId.values()];
  const hasCustomOrder = all.some((role) => typeof role.permissions.sortOrder === "number");
  if (hasCustomOrder) {
    return all.sort((a, b) => {
      const aOrder = a.permissions.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.permissions.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
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

/** Union of tabs/flags/actions across roles — most permissive wins. */
export function combineRolePermissions(definitions: RoleDefinition[]): RolePermissions {
  if (definitions.some((role) => isSecretFounderRole(role))) {
    return normalizeRolePermissions({
      tabs: [...ALL_TABS],
      actions: [...getRegisteredKeys()],
      manageUsers: true,
      editSiteContent: true,
    });
  }
  const tabs = new Set<string>();
  const actions = new Set<string>();
  let manageUsers = false;
  let editSiteContent = false;
  for (const role of definitions) {
    for (const tab of role.permissions.tabs) tabs.add(tab);
    for (const action of role.permissions.actions ?? []) actions.add(action);
    if (role.permissions.manageUsers) manageUsers = true;
    if (role.permissions.editSiteContent) editSiteContent = true;
  }
  return normalizeRolePermissions({
    tabs: [...tabs],
    actions: [...actions],
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

export function userHasOwnerRole(user: {
  role?: string | null;
  roleIds?: string[] | null;
  email?: string | null;
}) {
  if (isBreakGlassAdminEmail(user.email)) return true;
  if (user.role && isFullAccessRoleId(user.role)) return true;
  return Boolean(user.roleIds?.some((id) => isFullAccessRoleId(id)));
}

export function roleCanAccessTab(role: RoleDefinition, tab: string) {
  if (isSecretFounderRole(role)) return true;
  if (tab === "settings") return true;
  if (tab === "customizer") return role.permissions.editSiteContent || role.permissions.tabs.includes("site-contents");
  return role.permissions.tabs.includes(tab);
}

export function roleCanManageUsers(role: RoleDefinition) {
  return isSecretFounderRole(role) || role.permissions.manageUsers;
}

export function roleCanEditSiteContent(role: RoleDefinition) {
  return isSecretFounderRole(role) || role.permissions.editSiteContent;
}
