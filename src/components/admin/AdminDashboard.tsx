"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { canAccessTab, canManageUsers, roleLabels } from "@/lib/admin-roles";
import type { StaffRole } from "@/lib/shop-types";
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
  | "customizer"
  | "settings";

type Props = { user: { id: string; name: string; role: StaffRole } };

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
  { id: "customizer", label: "Page Customizer", icon: Paintbrush },
  { id: "settings", label: "Site Settings", icon: Settings },
];

const validTabs = new Set<Tab>(nav.flatMap((n) => [n.id, ...(n.children?.map((c) => c.id) ?? [])]));

function readTabFromHash(): Tab {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace("#", "") as Tab;
  return validTabs.has(hash) ? hash : "dashboard";
}

export function AdminDashboard({ user }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
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

  function selectTab(id: Tab) {
    if (!canAccessTab(user.role, id)) return;
    setTab(id);
    window.location.hash = id;
    setMobileOpen(false);
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  function NavButton({ item, nested }: { item: { id: Tab; label: string; icon?: typeof LayoutDashboard }; nested?: boolean }) {
    const active = tab === item.id;
    return (
      <button
        type="button"
        onClick={() => selectTab(item.id)}
        className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition ${
          nested ? "pl-10 pr-3" : "px-3"
        } ${
          active
            ? "bg-gradient-to-r from-amber-500/15 to-pink-600/10 text-amber-200 ring-1 ring-amber-500/20"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
        }`}
      >
        {!nested && item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  const sidebar = (
    <>
      <div className="border-b border-slate-800/80 px-5 py-5">
        <SiteLogo size={44} showName subtitle="Staff Portal" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const children = item.children?.filter((child) => canAccessTab(user.role, child.id));
          return (
            <div key={item.id}>
              {children?.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      children.some((c) => c.id === tab)
                        ? "text-amber-200"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition ${expanded[item.id] ? "rotate-180" : ""}`} />
                  </button>
                  {expanded[item.id] && (
                    <div className="mt-1 space-y-0.5">
                      {children.map((child) => (
                        <NavButton key={child.id} item={{ ...child, icon: undefined }} nested />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavButton item={item} />
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        <div className="mb-3 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signed in</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-200">{user.name}</p>
          <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
        >
          <ExternalLink className="h-4 w-4" />
          View website
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400/80 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-800/80 bg-slate-900/30 backdrop-blur xl:flex">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-slate-900 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 py-3 backdrop-blur xl:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-white">Staff Portal</p>
            <p className="text-xs text-slate-500">{user.name} · {roleLabels[user.role]}</p>
          </div>
          <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:text-red-300">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="relative flex-1 overflow-auto">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.04),transparent_50%)]" />
          <div className="relative p-4 sm:p-6 lg:p-8">
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
            {tab === "customizer" && canAccessTab(user.role, "customizer") && <ContentEditor />}
            {tab === "settings" && <SettingsPanel name={user.name} />}
          </div>
        </main>
      </div>
    </div>
  );
}
