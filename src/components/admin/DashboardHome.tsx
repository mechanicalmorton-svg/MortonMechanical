"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, ClipboardList, DollarSign, MapPin, Plus, Wrench } from "lucide-react";
import type { Booking, DashboardStats, InventoryItem, StaffRole, WorkOrder } from "@/lib/shop-types";
import { adminGet } from "./admin-fetch";
import type { Tab } from "./AdminDashboard";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, btnSecondary } from "./admin-ui";

type Props = {
  name: string;
  role: StaffRole;
  canManageUsers?: boolean;
  onNavigate: (tab: Tab) => void;
};

type StatModal = "open-work-orders" | "today-bookings" | "urgent" | "mtd-revenue" | null;

type DashboardData = {
  stats: DashboardStats;
  pendingBookings: Booking[];
  inProgressWorkOrders: WorkOrder[];
  todaySchedule: Booking[];
  openWorkOrders: WorkOrder[];
  urgentWorkOrders: WorkOrder[];
  lowStockItems: InventoryItem[];
  mtdCompletedJobs: WorkOrder[];
};

function formatOrderNumber(id: string) {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `WO-${compact.slice(-12) || id.slice(0, 12).toUpperCase()}`;
}

export function DashboardHome({ name, canManageUsers = false, onNavigate }: Props) {
  const toast = useAdminToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statModal, setStatModal] = useState<StatModal>(null);

  useEffect(() => {
    adminGet<DashboardData>("/api/admin/dashboard").then(({ data: payload, error: message }) => {
      if (message) toast.error(message);
      else setData(payload);
      setLoading(false);
    });
  }, [toast]);

  const stats = data?.stats;
  const quickActions: { label: string; tab: Tab; primary?: boolean }[] = [
    { label: "New Work Order", tab: "work-orders", primary: true },
    { label: "New Booking", tab: "bookings" },
    { label: "Quote Requests", tab: "quotes" },
    { label: "My Route Today", tab: "routes-today" },
  ];
  if (canManageUsers) quickActions.push({ label: "Add User", tab: "users" });

  const mtdTotal = data?.mtdCompletedJobs.reduce((sum, job) => sum + (job.revenue ?? 0), 0) ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${greeting}, ${name.split(" ")[0] || name}`}
        subtitle="Here’s what’s happening across the shop today — work orders, bookings, and the jobs that need attention."
        eyebrow="Operations dashboard"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="admin-rise admin-rise-delay-1">
          <StatCard
            label="Queued Work Orders"
            value={loading ? "—" : stats?.openWorkOrders ?? 0}
            hint={`${stats?.inProgressWorkOrders ?? 0} in shop`}
            icon={ClipboardList}
            accent="amber"
            active={statModal === "open-work-orders"}
            onClick={() => setStatModal((current) => (current === "open-work-orders" ? null : "open-work-orders"))}
          />
        </div>
        <div className="admin-rise admin-rise-delay-2">
          <StatCard
            label="Today's Bookings"
            value={loading ? "—" : stats?.todayBookings ?? 0}
            hint={`${stats?.pendingBookings ?? 0} pending confirmation`}
            icon={Calendar}
            accent="purple"
            active={statModal === "today-bookings"}
            onClick={() => setStatModal((current) => (current === "today-bookings" ? null : "today-bookings"))}
          />
        </div>
        <div className="admin-rise admin-rise-delay-3">
          <StatCard
            label="Urgent Items"
            value={loading ? "—" : stats?.urgentItems ?? 0}
            hint="Work orders & low stock"
            icon={AlertTriangle}
            accent="red"
            active={statModal === "urgent"}
            onClick={() => setStatModal((current) => (current === "urgent" ? null : "urgent"))}
          />
        </div>
        <div className="admin-rise admin-rise-delay-4">
          <StatCard
            label="MTD Revenue"
            value={loading ? "—" : `$${(stats?.mtdRevenue ?? 0).toLocaleString()}`}
            hint="Completed jobs this month"
            icon={DollarSign}
            accent="emerald"
            active={statModal === "mtd-revenue"}
            onClick={() => setStatModal((current) => (current === "mtd-revenue" ? null : "mtd-revenue"))}
          />
        </div>
      </div>

      <AdminModal
        open={statModal === "open-work-orders"}
        onClose={() => setStatModal(null)}
        title="Open Work Orders"
        wide
      >
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : !data?.openWorkOrders.length ? (
          <EmptyState icon={ClipboardList} title="No queued work orders" text="Draft and scheduled jobs waiting to start will appear here." />
        ) : (
          <ul className="space-y-3">
            {data.openWorkOrders.map((order) => (
              <li key={order.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{order.customerName}</p>
                    <p className="text-sm text-slate-400">{order.service}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatOrderNumber(order.id)}
                      {order.vehicle ? ` · ${order.vehicle}` : ""}
                      {order.scheduledDate ? ` · Due ${new Date(order.scheduledDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status="pending" />
                    {order.priority === "urgent" ? <StatusBadge status="urgent" /> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
          <button type="button" onClick={() => { setStatModal(null); onNavigate("work-orders"); }} className={btnSecondary}>
            Open work orders page
          </button>
        </div>
      </AdminModal>

      <AdminModal
        open={statModal === "today-bookings"}
        onClose={() => setStatModal(null)}
        title="Today's Bookings"
        wide
      >
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : !data?.todaySchedule.length ? (
          <EmptyState icon={Calendar} title="Nothing scheduled today" text="Confirmed bookings for today will appear here." />
        ) : (
          <ul className="space-y-3">
            {data.todaySchedule.map((booking) => (
              <li key={booking.id} className="flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-3">
                <span className="shrink-0 rounded-lg bg-purple-500/10 px-3 py-1.5 text-sm font-semibold text-purple-300">{booking.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{booking.customerName}</p>
                  <p className="truncate text-sm text-slate-400">{booking.service}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <StatusBadge status={booking.status} />
                    {booking.address ? <span>{booking.address}</span> : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
          <button type="button" onClick={() => { setStatModal(null); onNavigate("bookings"); }} className={btnSecondary}>
            Open bookings page
          </button>
        </div>
      </AdminModal>

      <AdminModal
        open={statModal === "urgent"}
        onClose={() => setStatModal(null)}
        title="Urgent Items"
        wide
      >
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : !data?.urgentWorkOrders.length && !data?.lowStockItems.length ? (
          <EmptyState icon={AlertTriangle} title="Nothing urgent right now" text="Urgent work orders and low-stock parts will appear here." />
        ) : (
          <div className="space-y-6">
            {data?.urgentWorkOrders.length ? (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Urgent work orders</h3>
                <ul className="space-y-3">
                  {data.urgentWorkOrders.map((order) => (
                    <li key={order.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="font-medium text-white">{order.customerName}</p>
                      <p className="text-sm text-slate-400">{order.service}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatOrderNumber(order.id)} · <StatusBadge status={order.status} />
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {data?.lowStockItems.length ? (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-white">Low stock parts</h3>
                <ul className="space-y-3">
                  {data.lowStockItems.map((item) => (
                    <li key={item.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-sm text-slate-400">{item.sku || item.partNumber || "No SKU"}</p>
                        </div>
                        <p className="text-sm font-semibold text-amber-300">
                          {item.quantity} / {item.minStock}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
          <button type="button" onClick={() => { setStatModal(null); onNavigate("work-orders"); }} className={btnSecondary}>
            Work orders
          </button>
          <button type="button" onClick={() => { setStatModal(null); onNavigate("inventory-low"); }} className={btnSecondary}>
            Low stock
          </button>
        </div>
      </AdminModal>

      <AdminModal
        open={statModal === "mtd-revenue"}
        onClose={() => setStatModal(null)}
        title="MTD Revenue"
        wide
      >
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-200/80">Month to date</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">${mtdTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-xs text-emerald-100/70">{data?.mtdCompletedJobs.length ?? 0} completed job{(data?.mtdCompletedJobs.length ?? 0) === 1 ? "" : "s"}</p>
            </div>
            {!data?.mtdCompletedJobs.length ? (
              <EmptyState icon={DollarSign} title="No completed revenue yet" text="Completed work orders with revenue will show here." />
            ) : (
              <ul className="space-y-3">
                {data.mtdCompletedJobs.map((order) => (
                  <li key={order.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                    <div>
                      <p className="font-medium text-white">{order.customerName}</p>
                      <p className="text-sm text-slate-400">{order.service}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatOrderNumber(order.id)} · Completed {new Date(order.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-semibold text-emerald-300">${(order.revenue ?? 0).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <div className="mt-4 flex justify-end border-t border-slate-800 pt-4">
          <button type="button" onClick={() => { setStatModal(null); onNavigate("work-orders"); }} className={btnSecondary}>
            Open work orders page
          </button>
        </div>
      </AdminModal>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Shortcuts</p>
            <h2 className="admin-glass-title admin-glass-title--sm admin-display mt-1">
              <span className="admin-glass-title__sheen" aria-hidden />
              <span className="admin-glass-title__text">Quick actions</span>
            </h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickActions.map(({ label, tab, primary }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className={`group rounded-2xl border px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                primary
                  ? "border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-pink-600/10 shadow-lg shadow-amber-950/20"
                  : "border-slate-800/70 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${
                  primary ? "bg-amber-500/20 text-amber-200 ring-amber-400/30" : "bg-slate-800 text-slate-300 ring-slate-700"
                }`}
              >
                <Plus className="h-4 w-4" />
              </span>
              <p className={`mt-3 text-sm font-semibold ${primary ? "text-amber-50" : "text-white"}`}>{label}</p>
              <p className="mt-1 text-xs text-slate-500 transition group-hover:text-slate-400">Open workspace</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Pending Bookings" badge={data?.pendingBookings.length ?? 0} description="Appointments waiting on confirmation">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !data?.pendingBookings.length ? (
            <EmptyState icon={Calendar} title="No pending bookings" text="Confirmed or pending appointments will appear here." />
          ) : (
            <ul className="space-y-3">
              {data.pendingBookings.map((b) => (
                <li key={b.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{b.customerName}</p>
                      <p className="text-sm text-slate-400">{b.service}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(b.date).toLocaleDateString()} at {b.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="In Progress" badge={data?.inProgressWorkOrders.length ?? 0} description="Jobs currently on the floor">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !data?.inProgressWorkOrders.length ? (
            <EmptyState icon={Wrench} title="No work in progress" text="Active jobs will show here once started." />
          ) : (
            <ul className="space-y-3">
              {data.inProgressWorkOrders.map((w) => (
                <li key={w.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
                  <p className="font-medium text-white">{w.customerName}</p>
                  <p className="text-sm text-slate-400">{w.service}</p>
                  <p className="mt-1 text-xs text-slate-500">{w.vehicle || "No vehicle listed"}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Today's Schedule" badge={data?.todaySchedule.length ?? 0} description="Confirmed visits for today">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !data?.todaySchedule.length ? (
            <EmptyState icon={MapPin} title="Nothing scheduled today" text="Confirmed bookings for today will appear here." />
          ) : (
            <ul className="space-y-3">
              {data.todaySchedule.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-800/70 bg-gradient-to-r from-slate-950/60 to-slate-900/30 px-4 py-3.5"
                >
                  <span className="shrink-0 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/20">
                    {b.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{b.customerName}</p>
                    <p className="truncate text-sm text-slate-400">
                      {b.service}
                      {b.address ? ` · ${b.address}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
