"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  Wrench,
  X,
} from "lucide-react";
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
import { SiteLogo } from "@/components/SiteLogo";
import type { StaffRole } from "@/lib/shop-types";

export type Tab =
  | "dashboard"
  | "inventory"
  | "inventory-low"
  | "work-orders"
  | "bookings"
  | "quotes"
  | "users"
  | "fleet"
  | "routes"
  | "routes-today"
  | "customizer"
  | "settings";

type Props = { user: { id: string; username: string; email?: string; name: string; role: StaffRole } };

const roleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  mechanic: "Mechanic",
  dispatcher: "Dispatcher",
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
    id: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { id: "inventory", label: "All parts" },
      { id: "inventory-low", label: "Low stock" },
    ],
  },
  { id: "work-orders", label: "Work Orders", icon: ClipboardList },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "quotes", label: "Quote Requests", icon: BookOpen },
  { id: "users", label: "User Management", icon: Users },
  { id: "fleet", label: "Fleet Management", icon: Truck },
  {
    id: "routes",
    label: "Routes",
    icon: Map,
    children: [
      { id: "routes", label: "Route manager" },
      { id: "routes-today", label: "My route today" },
    ],
  },
  { id: "customizer", label: "Page Customizer", icon: Paintbrush },
  { id: "settings", label: "Site Settings", icon: Settings },
];

const validTabs = new Set<Tab>(nav.flatMap((n) => [n.id, ...(n.children?.map((c) => c.id) ?? [])]));

export function AdminDashboard({ user }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ inventory: true, routes: true });

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (validTabs.has(hash)) setTab(hash);
  }, []);

  function selectTab(id: Tab) {
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
        {nav.map((item) => (
          <div key={item.id}>
            {item.children ? (
              <>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    tab === item.id || item.children.some((c) => c.id === tab)
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
                    {item.children.map((child) => (
                      <NavButton key={child.id} item={{ ...child, icon: undefined }} nested />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavButton item={item} />
            )}
          </div>
        ))}
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
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-slate-900 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 py-3 backdrop-blur xl:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-semibold text-white">Staff Portal</p>
          <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:text-red-300">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="relative flex-1 overflow-auto">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.04),transparent_50%)]" />
          <div className="relative p-4 sm:p-6 lg:p-8">
            {tab === "dashboard" && <DashboardHome username={user.name} onNavigate={selectTab} />}
            {tab === "inventory" && <InventoryPanel />}
            {tab === "inventory-low" && <InventoryPanel lowStockOnly />}
            {tab === "work-orders" && <WorkOrdersPanel />}
            {tab === "bookings" && <BookingsPanel />}
            {tab === "quotes" && <QuotesPanel />}
            {tab === "users" && <StaffPanel />}
            {tab === "fleet" && <FleetPanel />}
            {tab === "routes" && <RoutesPanel />}
            {tab === "routes-today" && <RoutesPanel todayOnly />}
            {tab === "customizer" && <ContentEditor />}
            {tab === "settings" && <SettingsPanel username={user.name} />}
          </div>
        </main>
      </div>
    </div>
  );
}
