"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Paintbrush,
  ScrollText,
  UserCircle,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { canAccessPage, hasPermission } from "@/lib/permissions";
import { useShopContact } from "@/lib/use-shop-contact";
import { userHasOwnerRole, type RoleColorStyle, type RolePermissions } from "@/lib/role-definitions";
import type { StaffRole } from "@/lib/shop-types";
import { RoleBadge } from "./admin-ui";
import { AuditLogsPanel } from "./AuditLogsPanel";
import { BookingsPanel } from "./BookingsPanel";
import { ContentEditor } from "./ContentEditor";
import { DashboardHome } from "./DashboardHome";
import { FleetPanel } from "./FleetPanel";
import { InventoryPanel } from "./InventoryPanel";
import { PermissionsProvider } from "./permissions";
import { QuotesPanel } from "./QuotesPanel";
import { RoutesPanel } from "./RoutesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StaffPanel } from "./StaffPanel";
import { TimeclockNavControl } from "./TimeclockNavControl";
import { TimesheetsPanel } from "./TimesheetsPanel";
import { VehicleChecklistsPanel } from "./VehicleChecklistsPanel";
import { VehicleManagerPanel } from "./VehicleManagerPanel";
import { WorkOrdersPanel } from "./WorkOrdersPanel";
import { AdminToastProvider } from "./AdminToast";

export type Tab =
  | "dashboard"
  | "inventory-all"
  | "inventory-low"
  | "work-orders"
  | "bookings"
  | "quotes"
  | "users"
  | "fleet"
  | "vehicle-manager"
  | "vehicle-checklists"
  | "routes-manager"
  | "routes-today"
  | "timesheets"
  | "site-contents"
  | "audit-logs"
  | "settings";

type Props = {
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: StaffRole;
    roleIds?: StaffRole[];
    roles?: { id: string; name: string; color: string; colorStyle?: RoleColorStyle }[];
    roleName?: string;
    roleColor?: string;
    permissions?: RolePermissions;
    permissionOverrides?: { grant?: string[]; deny?: string[] };
    avatarUrl?: string;
  };
};

function displayRoles(user: Props["user"]): {
  id: string;
  name: string;
  color: string;
  colorStyle?: RoleColorStyle;
}[] {
  if (user.roles?.length) return user.roles;
  const ids = user.roleIds?.length ? user.roleIds : [user.role];
  return ids.map((id) => ({
    id,
    name: id === user.role ? user.roleName || id : id,
    color: id === user.role ? user.roleColor || "slate" : "slate",
  }));
}

function userCanAccessTab(user: Props["user"], tab: string) {
  return canAccessPage(user, tab);
}

type NavLeaf = {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  label: string;
  items: NavLeaf[];
};

/** Grouped layout with original workspace names. Account Settings stays on the user card. */
const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Jobs",
    items: [
      { id: "work-orders", label: "Work Orders", icon: ClipboardList },
      { id: "bookings", label: "Bookings", icon: Calendar },
      { id: "quotes", label: "Quote Requests", icon: BookOpen },
    ],
  },
  {
    label: "Parts",
    items: [
      { id: "inventory-all", label: "All parts", icon: Package },
      { id: "inventory-low", label: "Low stock", icon: AlertTriangle },
    ],
  },
  {
    label: "Shop vehicles",
    items: [
      { id: "fleet", label: "Fleet Management", icon: Truck },
      { id: "vehicle-manager", label: "Vehicle Manager", icon: Wrench },
      { id: "vehicle-checklists", label: "Checklists", icon: ClipboardCheck },
    ],
  },
  {
    label: "Field",
    items: [
      { id: "routes-manager", label: "Route manager", icon: Map },
      { id: "routes-today", label: "My route today", icon: Map },
      { id: "timesheets", label: "Timesheets", icon: Clock },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "site-contents", label: "Site Contents", icon: Paintbrush },
      { id: "audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

const nav = navGroups.flatMap((group) => group.items);

const accountTab: Tab = "settings";

function firstAccessibleTab(user: Props["user"]): Tab {
  for (const item of nav) {
    if (userCanAccessTab(user, item.id)) return item.id;
  }
  return "settings";
}

const validTabs = new Set<Tab>([...nav.map((n) => n.id), accountTab]);

function readTabFromHash(): Tab {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace("#", "");
  const normalized = hash === "customizer" ? "site-contents" : hash;
  return validTabs.has(normalized as Tab) ? (normalized as Tab) : "dashboard";
}

export function AdminDashboard({ user }: Props) {
  const router = useRouter();
  const shop = useShopContact();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => userCanAccessTab(user, item.id)),
        }))
        .filter((group) => group.items.length > 0),
    [user],
  );

  useEffect(() => {
    const syncTab = () => {
      const next = readTabFromHash();
      if (!userCanAccessTab(user, next)) {
        const fallback = firstAccessibleTab(user);
        setTab(fallback);
        window.location.hash = fallback;
        return;
      }
      setTab(next);
    };
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, [user]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function closeMenu(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [userMenuOpen]);

  function selectTab(id: Tab) {
    if (!userCanAccessTab(user, id)) return;
    setTab(id);
    window.location.hash = id;
    setMobileOpen(false);
    setUserMenuOpen(false);
  }

  async function logout() {
    setUserMenuOpen(false);
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  function userInitials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  function UserCard() {
    const isOwner = userHasOwnerRole(user);
    const founderRing = isOwner ? "ring-sky-400/40" : "ring-amber-500/30";
    const roleBadges = displayRoles(user);

    return (
      <div ref={userMenuRef} className="relative">
        {userMenuOpen ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl shadow-black/50 ring-1 ring-black/30 backdrop-blur-xl">
            <div className="border-b border-slate-800/80 px-4 py-3.5">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {roleBadges.map((role) => (
                  <RoleBadge
                    key={role.id}
                    role={role.id}
                    roleName={role.name}
                    roleColor={role.color}
                    roleColorStyle={role.colorStyle}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => {
                  selectTab(accountTab);
                  setUserMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-slate-800/80"
              >
                <UserCircle className="h-4 w-4 text-amber-400" />
                Account settings
              </button>
              <Link
                href="/"
                target="_blank"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-800/80"
              >
                <ExternalLink className="h-4 w-4 text-slate-400" />
                View website
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setUserMenuOpen((open) => !open)}
          className={`flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition duration-200 ${
            userMenuOpen
              ? "border-amber-500/35 bg-amber-500/10 ring-1 ring-amber-400/20"
              : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80"
          }`}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className={`h-8 w-8 shrink-0 rounded-full object-cover ring-2 ${founderRing}`}
            />
          ) : (
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ${
                isOwner
                  ? "bg-sky-500/15 text-sky-200 ring-sky-400/40"
                  : "bg-gradient-to-br from-amber-500/20 to-pink-600/20 text-amber-200 ring-amber-500/30"
              }`}
            >
              {userInitials(user.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-100">{user.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {roleBadges.slice(0, 2).map((role) => (
                <RoleBadge
                  key={role.id}
                  role={role.id}
                  roleName={role.name}
                  roleColor={role.color}
                  roleColorStyle={role.colorStyle}
                  size="sm"
                />
              ))}
            </div>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${userMenuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    );
  }

  function NavButton({ item }: { item: NavLeaf }) {
    const active = tab === item.id;
    return (
      <button
        type="button"
        data-active={active}
        onClick={() => selectTab(item.id)}
        className={`admin-nav-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium ${
          active
            ? "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-pink-600/10 text-amber-100 shadow-sm shadow-amber-950/20"
            : "text-slate-400 hover:bg-slate-800/45 hover:text-slate-100"
        }`}
      >
        <item.icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-amber-300" : ""}`} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  const sidebar = (
    <>
      <div className="relative shrink-0 border-b border-slate-800/70 px-3 py-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <SiteLogo
          size={34}
          showName
          subtitle="Dashboard"
          name={shop.businessName}
          src={shop.logos.dashboard}
          scale={shop.logoScales.dashboard}
        />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-2 py-2">
        {visibleGroups.map((group) => (
          <div key={group.label} className="min-h-0">
            <p className="group/nav-label relative mx-2.5 mb-1.5 inline-flex pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/80">
              {group.label}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-400/90 via-amber-300/50 to-transparent"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500/80 shadow-[0_0_10px_rgba(245,158,11,0.45)]"
              />
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-800/70 p-2">
        <UserCard />
      </div>
    </>
  );

  const showUsers = userCanAccessTab(user, "users");
  const canManageCategories = hasPermission(user, "inventory.adjust");

  return (
    <AdminToastProvider>
      <PermissionsProvider user={user}>
        <div className="flex h-dvh min-h-0 overflow-hidden">
          <aside className="admin-glass sticky top-0 hidden h-dvh w-[17.5rem] shrink-0 flex-col border-y-0 border-l-0 xl:flex">
            {sidebar}
          </aside>

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 xl:hidden">
              <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
              <aside className="admin-glass relative flex h-dvh w-[17.5rem] max-w-[88vw] flex-col shadow-2xl">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="absolute right-3 top-3 z-10 rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
                {sidebar}
              </aside>
            </div>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <header className="sticky top-0 z-40 shrink-0 border-b border-slate-800/70 bg-slate-950/70 px-4 py-3.5 backdrop-blur-xl sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800 xl:hidden"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <TimeclockNavControl />
                </div>
                <div className="ml-auto hidden items-center gap-2.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => selectTab(accountTab)}
                    className="group inline-flex items-center gap-2.5 rounded-full border border-slate-700/70 bg-slate-950/55 py-1 pl-1 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-amber-500/35 hover:bg-slate-900/80 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                    title="Account settings"
                    aria-label={`Open account settings for ${user.name}`}
                  >
                    <span className="relative shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className={`h-7 w-7 rounded-full object-cover ring-2 ${
                            userHasOwnerRole(user) ? "ring-sky-400/40" : "ring-amber-500/35"
                          }`}
                        />
                      ) : (
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ${
                            userHasOwnerRole(user)
                              ? "bg-sky-500/15 text-sky-200 ring-sky-400/40"
                              : "bg-gradient-to-br from-amber-500/25 to-pink-600/20 text-amber-100 ring-amber-500/35"
                          }`}
                        >
                          {userInitials(user.name)}
                        </span>
                      )}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950"
                        aria-hidden
                      />
                    </span>
                    <span className="min-w-0 text-left leading-tight">
                      <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 transition group-hover:text-slate-400">
                        Signed in
                      </span>
                      <span className="block max-w-[10rem] truncate text-xs font-semibold text-slate-100">
                        {user.name}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </header>

            <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="admin-soft-pulse absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl" />
              </div>
              <div key={tab} className="admin-rise relative p-4 sm:p-6 lg:p-8">
                {tab === "dashboard" && userCanAccessTab(user, "dashboard") && (
                  <DashboardHome name={user.name} role={user.role} onNavigate={selectTab} />
                )}
                {tab === "inventory-all" && (
                  <InventoryPanel role={user.role} canManageCategories={canManageCategories} />
                )}
                {tab === "inventory-low" && (
                  <InventoryPanel lowStockOnly role={user.role} canManageCategories={canManageCategories} />
                )}
                {tab === "work-orders" && <WorkOrdersPanel />}
                {tab === "bookings" && <BookingsPanel />}
                {tab === "quotes" && <QuotesPanel />}
                {tab === "users" && showUsers && (
                  <StaffPanel currentUserId={user.id} onSelfUpdated={() => router.refresh()} />
                )}
                {tab === "fleet" && <FleetPanel />}
                {tab === "vehicle-manager" && userCanAccessTab(user, "vehicle-manager") && <VehicleManagerPanel />}
                {tab === "vehicle-checklists" && userCanAccessTab(user, "vehicle-checklists") && (
                  <VehicleChecklistsPanel />
                )}
                {tab === "routes-manager" && <RoutesPanel />}
                {tab === "routes-today" && <RoutesPanel todayOnly userId={user.id} />}
                {tab === "timesheets" && userCanAccessTab(user, "timesheets") && <TimesheetsPanel />}
                {tab === "site-contents" && userCanAccessTab(user, "site-contents") && <ContentEditor />}
                {tab === "audit-logs" && userCanAccessTab(user, "audit-logs") && <AuditLogsPanel />}
                {tab === "settings" && <SettingsPanel user={user} />}
              </div>
            </main>
          </div>
        </div>
      </PermissionsProvider>
    </AdminToastProvider>
  );
}
