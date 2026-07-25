import type { StaffRole } from "./shop-types";
import {
  defaultRoleDefinitions,
  findRoleDefinition,
  roleCanAccessTab,
  roleCanEditSiteContent,
  roleCanManageUsers,
  roleChipClassName,
  type RoleDefinition,
} from "./role-definitions";

/** @deprecated Prefer permission helpers with a RoleDefinition or AuthUser permissions. */
export const roleLabels: Record<string, string> = Object.fromEntries(
  defaultRoleDefinitions().map((role) => [role.id, role.name]),
);

/** @deprecated Prefer getRoleBadgeClass(roleId, roles). */
export const roleBadgeClass: Record<string, string> = Object.fromEntries(
  defaultRoleDefinitions().map((role) => [role.id, roleChipClassName(role.color)]),
);

export function getRoleLabel(roleId: StaffRole, roles?: RoleDefinition[]) {
  return findRoleDefinition(roles ?? defaultRoleDefinitions(), roleId).name;
}

export function getRoleBadgeClass(roleId: StaffRole, roles?: RoleDefinition[]) {
  const role = findRoleDefinition(roles ?? defaultRoleDefinitions(), roleId);
  return roleChipClassName(role.color);
}

export function canManageUsers(role: StaffRole | RoleDefinition, roles?: RoleDefinition[]) {
  const definition = typeof role === "string" ? findRoleDefinition(roles ?? defaultRoleDefinitions(), role) : role;
  return roleCanManageUsers(definition);
}

export function canEditSiteContent(role: StaffRole | RoleDefinition, roles?: RoleDefinition[]) {
  const definition = typeof role === "string" ? findRoleDefinition(roles ?? defaultRoleDefinitions(), role) : role;
  return roleCanEditSiteContent(definition);
}

export function canAccessTab(role: StaffRole | RoleDefinition, tab: string, roles?: RoleDefinition[]) {
  const definition = typeof role === "string" ? findRoleDefinition(roles ?? defaultRoleDefinitions(), role) : role;
  return roleCanAccessTab(definition, tab);
}
