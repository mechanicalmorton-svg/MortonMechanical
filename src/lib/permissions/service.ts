import {
  actionsFromLegacy,
  ensureWorkspaceActions,
  expandCoarseActions,
  isPermissionKey,
  tabsFromActions,
} from "./catalog";
import { getRegisteredKeys as liveKeys } from "./register";
import { userHasOwnerRole } from "../role-definitions";
import type { RolePermissions } from "../role-definitions";

export type PermissionOverrides = {
  grant?: string[];
  deny?: string[];
};

export type PermissionUser = {
  email?: string | null;
  role?: string | null;
  roleIds?: string[] | null;
  permissions?: Partial<RolePermissions> | null;
  /** Per-user grant/deny applied after role union. */
  permissionOverrides?: PermissionOverrides | null;
};

/** Full access: Founder, Platform Architect (secret Founder), or break-glass emails. */
export function isFounder(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  return userHasOwnerRole(user);
}

function applyOverrides(base: Set<string>, overrides?: PermissionOverrides | null): Set<string> {
  if (!overrides) return base;
  const next = new Set(base);
  for (const key of overrides.grant ?? []) {
    if (isPermissionKey(key)) next.add(key);
  }
  for (const key of overrides.deny ?? []) {
    next.delete(key);
  }
  return next;
}

export function getEffectivePermissions(user: PermissionUser | null | undefined): Set<string> {
  if (!user) return new Set();
  if (isFounder(user)) return new Set(liveKeys());

  const tabs = Array.isArray(user.permissions?.tabs) ? user.permissions.tabs : [];
  const fromActions = Array.isArray(user.permissions?.actions)
    ? ensureWorkspaceActions(
        expandCoarseActions(user.permissions.actions.filter(isPermissionKey)),
        tabs,
      )
    : [];
  const base = fromActions.length
    ? new Set(fromActions)
    : new Set(
        actionsFromLegacy({
          tabs,
          manageUsers: user.permissions?.manageUsers,
          editSiteContent: user.permissions?.editSiteContent,
        }),
      );

  return applyOverrides(base, user.permissionOverrides);
}

export function hasPermission(user: PermissionUser | null | undefined, key: string): boolean {
  if (!user) return false;
  if (isFounder(user)) return true;
  return getEffectivePermissions(user).has(key);
}

export function hasAnyPermission(
  user: PermissionUser | null | undefined,
  keys: string[],
): boolean {
  if (!user) return false;
  if (isFounder(user)) return true;
  const effective = getEffectivePermissions(user);
  return keys.some((key) => effective.has(key));
}

export function hasAllPermissions(
  user: PermissionUser | null | undefined,
  keys: string[],
): boolean {
  if (!user) return false;
  if (isFounder(user)) return true;
  const effective = getEffectivePermissions(user);
  return keys.every((key) => effective.has(key));
}

export function canView(user: PermissionUser | null | undefined, module: string) {
  return hasPermission(user, `${module}.view`);
}

export function canEdit(user: PermissionUser | null | undefined, module: string) {
  return hasAnyPermission(user, [`${module}.edit`, `${module}.manage`]);
}

export function canDelete(user: PermissionUser | null | undefined, module: string) {
  return hasPermission(user, `${module}.delete`);
}

export function canCreate(user: PermissionUser | null | undefined, module: string) {
  return hasPermission(user, `${module}.create`);
}

/** Page/tab visibility derived from action permissions (hide-not-disable). */
export function canAccessPage(user: PermissionUser | null | undefined, tabId: string): boolean {
  if (!user) return false;
  if (isFounder(user)) return true;
  if (tabId === "settings") return true;
  if (tabId === "customizer") return hasPermission(user, "content.edit") || hasPermission(user, "content.view");

  const effective = getEffectivePermissions(user);
  const derivedTabs = new Set(tabsFromActions([...effective]));

  // Back-compat: honor legacy tabs only when actions were never stored.
  const hasStoredActions = Array.isArray(user.permissions?.actions) && user.permissions.actions.length > 0;
  if (!hasStoredActions && Array.isArray(user.permissions?.tabs)) {
    for (const tab of user.permissions.tabs) derivedTabs.add(tab);
  }

  if (tabId === "audit-logs") {
    return (
      derivedTabs.has("audit-logs") ||
      hasPermission(user, "audit_logs.view") ||
      hasAnyPermission(user, ["users.manage", "roles.edit"])
    );
  }
  if (tabId === "users") {
    return (
      derivedTabs.has("users") ||
      hasAnyPermission(user, ["users.view", "users.manage", "roles.view", "roles.edit"])
    );
  }
  if (tabId === "site-contents") {
    return derivedTabs.has("site-contents") || hasAnyPermission(user, ["content.view", "content.edit"]);
  }

  return derivedTabs.has(tabId);
}

export function canManageUsers(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  if (isFounder(user)) return true;
  // Prefer action keys; manageUsers flag is derived sync only.
  return hasAnyPermission(user, ["users.manage", "users.create", "users.edit", "roles.edit"]);
}

export function canEditSiteContent(user: PermissionUser | null | undefined): boolean {
  if (!user) return false;
  if (isFounder(user)) return true;
  return Boolean(user.permissions?.editSiteContent) || hasPermission(user, "content.edit");
}
