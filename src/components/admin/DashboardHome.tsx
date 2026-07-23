"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  DollarSign,
  MapPin,
  Package,
  Plus,
  Truck,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { Booking, WorkOrder } from "@/lib/shop-types";
import type { DashboardStats } from "@/lib/shop-types";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, btnPrimary, btnSecondary } from "./admin-ui";

import type { Tab } from "./AdminDashboard";

type Props = {
  username: string;
  onNavigate: (tab: Tab) => void;
};

type DashboardData = {
  stats: DashboardStats;
  pendingBookings: Booking[];
  inProgressWorkOrders: WorkOrder[];
  todaySchedule: Booking[];
};

export function DashboardHome({ username, onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Dashboard Overview" subtitle={`Welcome back, ${displayName}!`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Work Orders"
          value={loading ? "—" : stats?.openWorkOrders ?? 0}
          hint={`${stats?.inProgressWorkOrders ?? 0} in progress`}
          icon={ClipboardList}
          accent="amber"
        />
        <StatCard
          label="Today's Bookings"
          value={loading ? "—" : stats?.todayBookings ?? 0}
          hint={`${stats?.pendingBookings ?? 0} pending confirmation`}
          icon={Calendar}
          accent="purple"
        />
        <StatCard
          label="Urgent Items"
          value={loading ? "—" : stats?.urgentItems ?? 0}
          hint="Work orders & low stock"
          icon={AlertTriangle}
          accent="red"
        />
        <StatCard
          label="MTD Revenue"
          value={loading ? "—" : `$${(stats?.mtdRevenue ?? 0).toLocaleString()}`}
          hint="Revenue this month"
          icon={DollarSign}
          accent="emerald"
        />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-400" />
          <h2 className="font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { label: "New Work Order", tab: "work-orders" as Tab, primary: true },
            { label: "New Booking", tab: "bookings" as Tab, primary: false },
            { label: "Add Inventory", tab: "inventory" as Tab, primary: false },
            { label: "Add User", tab: "users" as Tab, primary: false },
            { label: "My Route Today", tab: "routes-today" as Tab, primary: false },
            { label: "Route Manager", tab: "routes" as Tab, primary: false },
            { label: "Page Customizer", tab: "customizer" as Tab, primary: false },
          ]).map(({ label, tab, primary }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className={primary ? btnPrimary : btnSecondary}
            >
              {primary && <Plus className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Pending Bookings" badge={data?.pendingBookings.length ?? 0}>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !data?.pendingBookings.length ? (
            <EmptyState icon={Calendar} title="No pending bookings" text="New bookings will appear here for confirmation." />
          ) : (
            <ul className="space-y-3">
              {data.pendingBookings.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition hover:border-slate-700/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{b.customerName}</p>
                      <p className="text-sm text-slate-400">{b.service}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(b.date).toLocaleDateString()} at {b.time}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="In Progress" badge={data?.inProgressWorkOrders.length ?? 0}>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !data?.inProgressWorkOrders.length ? (
            <EmptyState icon={Wrench} title="No work in progress" text="Active jobs will show here once started." />
          ) : (
            <ul className="space-y-3">
              {data.inProgressWorkOrders.map((w) => (
                <li
                  key={w.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition hover:border-slate-700/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{w.customerName}</p>
                      <p className="text-sm text-slate-400">{w.service}</p>
                      <p className="mt-1 text-xs text-slate-500">{w.vehicle}</p>
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Today's Schedule" badge={data?.todaySchedule.length ?? 0}>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !data?.todaySchedule.length ? (
            <EmptyState icon={MapPin} title="Nothing scheduled today" text="Confirmed bookings for today will appear here." />
          ) : (
            <ul className="space-y-3">
              {data.todaySchedule.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-3"
                >
                  <span className="shrink-0 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-300">
                    {b.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{b.customerName}</p>
                    <p className="truncate text-sm text-slate-400">{b.service}{b.address ? ` · ${b.address}` : ""}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
