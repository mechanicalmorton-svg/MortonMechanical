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
  owner: "Founder",
  admin: "Admin",
  mechanic: "Mechanic",
  dispatcher: "Dispatcher",
};

export const roleBadgeClass: Record<StaffRole, string> = {
  owner: "admin-glass-chip--sky text-sky-100",
  admin: "admin-glass-chip--violet text-violet-100",
  mechanic: "admin-glass-chip--slate text-slate-100",
  dispatcher: "admin-glass-chip--emerald text-emerald-100",
};
