"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Paintbrush,
  Sparkles,
  UserCircle,
  Truck,
  Users,
  X,
} from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { canAccessTab, canManageUsers } from "@/lib/admin-roles";
import type { StaffRole } from "@/lib/shop-types";
import { RoleBadge } from "./admin-ui";
import { BookingsPanel } from "./BookingsPanel";
import { ContentEditor } from "./ContentEditor";
import { DashboardHome } from "./DashboardHome";
import { FleetPanel } from "./FleetPanel";
import { InventoryPanel } from "./InventoryPanel";
import { QuotesPanel } from "./QuotesPanel";
import { RoutesPanel } from "./RoutesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StaffPanel } from "./StaffPanel";
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
  | "routes-manager"
  | "routes-today"
  | "site-contents"
  | "settings";

type Props = {
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: StaffRole;
    avatarUrl?: string;
  };
};

type NavItem = {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
  children?: { id: Tab; label: string }[];
};

const nav: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "inventory-all",
    label: "Inventory",
    icon: Package,
    children: [
      { id: "inventory-all", label: "All parts" },
      { id: "inventory-low", label: "Low stock" },
    ],
  },
  { id: "work-orders", label: "Work Orders", icon: ClipboardList },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "quotes", label: "Quote Requests", icon: BookOpen },
  { id: "users", label: "User Management", icon: Users },
  { id: "fleet", label: "Fleet Management", icon: Truck },
  {
    id: "routes-manager",
    label: "Routes",
    icon: Map,
    children: [
      { id: "routes-manager", label: "Route manager" },
      { id: "routes-today", label: "My route today" },
    ],
  },
  { id: "site-contents", label: "Site Contents", icon: Paintbrush },
];

const accountTab: Tab = "settings";

const validTabs = new Set<Tab>([
  ...nav.flatMap((n) => [n.id, ...(n.children?.map((c) => c.id) ?? [])]),
  accountTab,
]);

function readTabFromHash(): Tab {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace("#", "");
  const normalized = hash === "customizer" ? "site-contents" : hash;
  return validTabs.has(normalized as Tab) ? (normalized as Tab) : "dashboard";
}

export function AdminDashboard({ user }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "inventory-all": true, "routes-manager": true });

  const visibleNav = useMemo(
    () =>
      nav.filter((item) => {
        if (!canAccessTab(user.role, item.id)) return false;
        if (item.children) return item.children.some((child) => canAccessTab(user.role, child.id));
        return true;
      }),
    [user.role],
  );

  useEffect(() => {
    const syncTab = () => {
      const next = readTabFromHash();
      if (!canAccessTab(user.role, next)) {
        setTab("dashboard");
        window.location.hash = "dashboard";
        return;
      }
      setTab(next);
    };
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, [user.role]);

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
    if (!canAccessTab(user.role, id)) return;
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
    const founderRing = user.role === "owner" ? "ring-sky-400/40" : "ring-amber-500/30";

    return (
      <div ref={userMenuRef} className="relative">
        {userMenuOpen ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl shadow-black/50 ring-1 ring-black/30 backdrop-blur-xl">
            <div className="border-b border-slate-800/80 px-4 py-3.5">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
              <div className="mt-2.5">
                <RoleBadge role={user.role} />
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
          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition duration-200 ${
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
              className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${founderRing}`}
            />
          ) : (
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2 ${
                user.role === "owner"
                  ? "bg-sky-500/15 text-sky-200 ring-sky-400/40"
                  : "bg-gradient-to-br from-amber-500/20 to-pink-600/20 text-amber-200 ring-amber-500/30"
              }`}
            >
              {userInitials(user.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">{user.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${userMenuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    );
  }

  function NavButton({ item, nested }: { item: { id: Tab; label: string; icon?: typeof LayoutDashboard }; nested?: boolean }) {
    const active = tab === item.id;
    return (
      <button
        type="button"
        data-active={active}
        onClick={() => selectTab(item.id)}
        className={`admin-nav-item flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium ${
          nested ? "pl-11 pr-3" : "px-3"
        } ${
          active
            ? "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-pink-600/10 text-amber-100 shadow-sm shadow-amber-950/20"
            : "text-slate-400 hover:bg-slate-800/45 hover:text-slate-100"
        }`}
      >
        {!nested && item.icon ? <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-300" : ""}`} /> : null}
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  const sidebar = (
    <>
      <div className="relative border-b border-slate-800/70 px-5 py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <SiteLogo size={44} showName subtitle="Staff Portal" />
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/90">
          <Sparkles className="h-3 w-3" />
          Operations
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workspace</p>
        {visibleNav.map((item) => {
          const children = item.children?.filter((child) => canAccessTab(user.role, child.id));
          return (
            <div key={item.id}>
              {children?.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                    className={`admin-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      children.some((c) => c.id === tab)
                        ? "text-amber-100"
                        : "text-slate-400 hover:bg-slate-800/45 hover:text-slate-100"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition ${expanded[item.id] ? "rotate-180" : ""}`} />
                  </button>
                  {expanded[item.id] ? (
                    <div className="mt-1 space-y-0.5">
                      {children.map((child) => (
                        <NavButton key={child.id} item={{ ...child, icon: undefined }} nested />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <NavButton item={item} />
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/70 p-3">
        <UserCard />
      </div>
    </>
  );

  return (
    <AdminToastProvider>
      <div className="flex min-h-screen">
        <aside className="admin-glass hidden w-[17.5rem] shrink-0 flex-col border-y-0 border-l-0 xl:flex">
          {sidebar}
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
            <aside className="admin-glass relative flex h-full w-[17.5rem] max-w-[88vw] flex-col shadow-2xl">
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

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-slate-950/70 px-4 py-3.5 backdrop-blur-xl sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800 xl:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="ml-auto hidden items-center gap-3 sm:flex">
                <div className="rounded-full border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-400">
                  Signed in as <span className="font-medium text-slate-200">{user.name}</span>
                </div>
                <RoleBadge role={user.role} />
              </div>
            </div>
          </header>

          <main className="relative flex-1 overflow-auto">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="admin-soft-pulse absolute -right-24 top-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl" />
            </div>
            <div key={tab} className="admin-rise relative p-4 sm:p-6 lg:p-8">
              {tab === "dashboard" && <DashboardHome name={user.name} role={user.role} onNavigate={selectTab} />}
              {tab === "inventory-all" && <InventoryPanel />}
              {tab === "inventory-low" && <InventoryPanel lowStockOnly />}
              {tab === "work-orders" && <WorkOrdersPanel />}
              {tab === "bookings" && <BookingsPanel />}
              {tab === "quotes" && <QuotesPanel />}
              {tab === "users" && canManageUsers(user.role) && <StaffPanel />}
              {tab === "fleet" && <FleetPanel />}
              {tab === "routes-manager" && <RoutesPanel />}
              {tab === "routes-today" && <RoutesPanel todayOnly userId={user.id} />}
              {tab === "site-contents" && canAccessTab(user.role, "site-contents") && <ContentEditor />}
              {tab === "settings" && <SettingsPanel user={user} />}
            </div>
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
