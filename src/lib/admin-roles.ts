import type { StaffRole } from "./shop-types";

export function canManageUsers(role: StaffRole) {
  return role === "owner" || role === "admin";
}

export function canEditSiteContent(role: StaffRole) {
  return role === "owner" || role === "admin";
}

export function canAccessTab(role: StaffRole, tab: string) {
  if (tab === "users") return canManageUsers(role);
  if (tab === "site-contents" || tab === "customizer") return canEditSiteContent(role);
  return true;
}

export const roleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  mechanic: "Mechanic",
  dispatcher: "Dispatcher",
};
