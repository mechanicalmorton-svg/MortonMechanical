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
  owner: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  admin: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  mechanic: "bg-slate-500/15 text-slate-300 ring-slate-600/30",
  dispatcher: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
};
