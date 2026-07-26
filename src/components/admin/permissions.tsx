"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  canAccessPage,
  canCreate,
  canDelete,
  canEdit,
  canEditSiteContent,
  canManageUsers,
  canView,
  getEffectivePermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isFounder,
  type PermissionUser,
} from "@/lib/permissions";

const PermissionsContext = createContext<PermissionUser | null>(null);

export function PermissionsProvider({
  user,
  children,
}: {
  user: PermissionUser;
  children: ReactNode;
}) {
  return <PermissionsContext.Provider value={user}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  const user = useContext(PermissionsContext);
  return {
    user,
    isFounder: isFounder(user),
    actions: getEffectivePermissions(user),
    hasPermission: (key: string) => hasPermission(user, key),
    hasAnyPermission: (keys: string[]) => hasAnyPermission(user, keys),
    hasAllPermissions: (keys: string[]) => hasAllPermissions(user, keys),
    canView: (module: string) => canView(user, module),
    canCreate: (module: string) => canCreate(user, module),
    canEdit: (module: string) => canEdit(user, module),
    canDelete: (module: string) => canDelete(user, module),
    canAccessPage: (tabId: string) => canAccessPage(user, tabId),
    canManageUsers: canManageUsers(user),
    canEditSiteContent: canEditSiteContent(user),
  };
}

type CanProps = {
  permission?: string | string[];
  /** all = every key required; any = at least one (default). */
  mode?: "any" | "all";
  children: ReactNode;
  fallback?: ReactNode;
};

/** Hide UI when the signed-in staff user lacks the permission (render null). */
export function Can({ permission, mode = "any", children, fallback = null }: CanProps) {
  const { hasAnyPermission, hasAllPermissions, isFounder } = usePermissions();
  if (!permission) return <>{children}</>;
  if (isFounder) return <>{children}</>;
  const keys = Array.isArray(permission) ? permission : [permission];
  const allowed = mode === "all" ? hasAllPermissions(keys) : hasAnyPermission(keys);
  return <>{allowed ? children : fallback}</>;
}

export { CanColumn, CanField, CanTab, useFieldPermission } from "./permission-fields";
