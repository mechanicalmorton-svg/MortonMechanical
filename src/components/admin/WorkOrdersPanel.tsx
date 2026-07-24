"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import type { StaffMember, WorkOrder, WorkOrderStatus } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { WorkOrderFormModal } from "./WorkOrderFormModal";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

type StatusFilter = "pending" | "in_progress" | "completed" | "overdue" | null;

function formatOrderNumber(id: string) {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `WO-${compact.slice(-12) || id.slice(0, 12).toUpperCase()}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function isOverdue(order: WorkOrder) {
  if (!order.scheduledDate || order.status === "completed" || order.status === "cancelled") return false;
  const due = new Date(order.scheduledDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function statusBadgeKey(status: WorkOrderStatus) {
  return status === "open" ? "pending" : status;
}

function FilterStatCard({
  label,
  value,
  icon: Icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  accent: "blue" | "amber" | "emerald" | "red";
  active: boolean;
  onClick: () => void;
}) {
  const accents = {
    blue: "text-blue-400 from-blue-500/20 to-blue-600/5 ring-blue-500/20",
    amber: "text-amber-400 from-amber-500/20 to-amber-600/5 ring-amber-500/20",
    emerald: "text-emerald-400 from-emerald-500/20 to-emerald-600/5 ring-emerald-500/20",
    red: "text-red-400 from-red-500/20 to-red-600/5 ring-red-500/20",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition ${
        active
          ? "border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
          : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80 hover:shadow-lg hover:shadow-black/20"
      }`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}

export function WorkOrdersPanel() {
  const toast = useAdminToast();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewOrder, setViewOrder] = useState<WorkOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  async function load() {
    setLoading(true);
    const [orders, team] = await Promise.all([
      adminGet<WorkOrder[]>("/api/admin/work-orders"),
      adminGet<StaffMember[]>("/api/admin/staff"),
    ]);
    if (orders.error) toast.error(orders.error);
    else setItems(orders.data ?? []);
    if (team.error) toast.error(team.error);
    else setStaff(team.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      pending: items.filter((w) => w.status === "open").length,
      inProgress: items.filter((w) => w.status === "in_progress").length,
      completed: items.filter((w) => w.status === "completed").length,
      overdue: items.filter(isOverdue).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((order) => {
      if (statusFilter === "pending" && order.status !== "open") return false;
      if (statusFilter === "in_progress" && order.status !== "in_progress") return false;
      if (statusFilter === "completed" && order.status !== "completed") return false;
      if (statusFilter === "overdue" && !isOverdue(order)) return false;

      if (filterStatus === "open" && order.status !== "open") return false;
      if (filterStatus === "in_progress" && order.status !== "in_progress") return false;
      if (filterStatus === "completed" && order.status !== "completed") return false;
      if (filterStatus === "cancelled" && order.status !== "cancelled") return false;
      if (filterStatus === "overdue" && !isOverdue(order)) return false;

      if (filterPriority && order.priority !== filterPriority) return false;
      if (filterAssigned && order.assignedTo !== filterAssigned) return false;

      if (dueFrom && (!order.scheduledDate || order.scheduledDate < dueFrom)) return false;
      if (dueTo && (!order.scheduledDate || order.scheduledDate > dueTo)) return false;

      if (!query) return true;

      const haystack = [
        formatOrderNumber(order.id),
        order.id,
        order.customerName,
        order.phone,
        order.vehicle,
        order.service,
        order.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, statusFilter, search, filterStatus, filterPriority, filterAssigned, dueFrom, dueTo]);

  function staffName(id?: string) {
    if (!id) return "—";
    return staff.find((member) => member.id === id)?.name ?? "—";
  }

  function toggleStatusFilter(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? null : next));
    setFilterStatus("");
  }

  function openCreateModal() {
    setEditingOrder(null);
    setShowForm(true);
  }

  function openEditModal(order: WorkOrder) {
    setEditingOrder(order);
    setShowForm(true);
  }

  function closeFormModal() {
    setShowForm(false);
    setEditingOrder(null);
  }

  async function patch(id: string, patch: Partial<WorkOrder>) {
    const { error: message } = await adminSend("/api/admin/work-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (message) toast.error(message);
    else {
      toast.success("Work order updated.");
      load();
    }
  }

  async function complete(id: string) {
    const input = window.prompt("Revenue for this job ($)?", "0");
    if (input === null) return;
    const revenue = Number(input);
    if (Number.isNaN(revenue) || revenue < 0) {
      toast.error("Enter a valid revenue amount.");
      return;
    }
    await patch(id, { status: "completed", revenue });
    setViewOrder(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this work order?")) return;
    const { error: message } = await adminSend("/api/admin/work-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else {
      toast.success("Work order deleted.");
      setViewOrder(null);
      load();
    }
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Work Orders" subtitle="Manage and track all work orders across your shop." />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className={btnSecondary} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={openCreateModal} className={btnPrimary}>
            <Plus className="h-4 w-4" /> New Work Order
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FilterStatCard
          label="Pending"
          value={counts.pending}
          icon={Clock}
          accent="blue"
          active={statusFilter === "pending"}
          onClick={() => toggleStatusFilter("pending")}
        />
        <FilterStatCard
          label="In Progress"
          value={counts.inProgress}
          icon={AlertTriangle}
          accent="amber"
          active={statusFilter === "in_progress"}
          onClick={() => toggleStatusFilter("in_progress")}
        />
        <FilterStatCard
          label="Completed"
          value={counts.completed}
          icon={CheckCircle2}
          accent="emerald"
          active={statusFilter === "completed"}
          onClick={() => toggleStatusFilter("completed")}
        />
        <FilterStatCard
          label="Overdue"
          value={counts.overdue}
          icon={Calendar}
          accent="red"
          active={statusFilter === "overdue"}
          onClick={() => toggleStatusFilter("overdue")}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search work orders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            className={inputClass}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setStatusFilter(null);
            }}
          >
            <option value="">All statuses</option>
            <option value="open">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>
          <select className={inputClass} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
          <select className={inputClass} value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)}>
            <option value="">All technicians</option>
            {staff.filter((member) => member.active).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="block text-xs text-slate-400">
            Due date from
            <input className={`${inputClass} mt-1`} type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
          </label>
          <label className="block text-xs text-slate-400">
            Due date to
            <input className={`${inputClass} mt-1`} type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
          </label>
        </div>
      </div>

      <AdminModal
        open={showForm}
        onClose={closeFormModal}
        title={editingOrder ? "Edit Work Order" : "Create New Work Order"}
        wide
      >
        {showForm ? (
          <WorkOrderFormModal
            onClose={closeFormModal}
            onSaved={load}
            editingOrder={editingOrder}
            staff={staff}
          />
        ) : null}
      </AdminModal>

      <AdminModal open={!!viewOrder} onClose={() => setViewOrder(null)} title={viewOrder ? formatOrderNumber(viewOrder.id) : "Work Order"} wide>
        {viewOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={statusBadgeKey(viewOrder.status)} />
              <StatusBadge status={viewOrder.priority === "urgent" ? "urgent" : "normal"} />
              {isOverdue(viewOrder) && <StatusBadge status="overdue" />}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Customer</dt>
                <dd className="mt-1 text-sm text-white">{viewOrder.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
                <dd className="mt-1 text-sm text-slate-300">{viewOrder.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Vehicle</dt>
                <dd className="mt-1 text-sm text-slate-300">{viewOrder.vehicle || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Assigned to</dt>
                <dd className="mt-1 text-sm text-slate-300">{staffName(viewOrder.assignedTo)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Due date</dt>
                <dd className="mt-1 text-sm text-slate-300">{formatDate(viewOrder.scheduledDate)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Total charge</dt>
                <dd className="mt-1 text-sm text-emerald-300">${(viewOrder.revenue ?? 0).toFixed(2)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Description</dt>
                <dd className="mt-1 text-sm text-slate-300">{viewOrder.service}</dd>
              </div>
              {viewOrder.customerConcern ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Customer concern</dt>
                  <dd className="mt-1 text-sm text-slate-300">{viewOrder.customerConcern}</dd>
                </div>
              ) : null}
              {viewOrder.internalNotes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Internal notes</dt>
                  <dd className="mt-1 text-sm text-slate-400">{viewOrder.internalNotes}</dd>
                </div>
              ) : null}
              {viewOrder.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Notes</dt>
                  <dd className="mt-1 rounded-lg bg-slate-950/50 p-3 text-sm text-slate-400">{viewOrder.notes}</dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
              {viewOrder.status === "open" && (
                <>
                  <button type="button" onClick={() => patch(viewOrder.id, { status: "in_progress" })} className={btnPrimary}>
                    Start job
                  </button>
                  <button type="button" onClick={() => patch(viewOrder.id, { status: "cancelled" })} className={btnSecondary}>
                    Cancel
                  </button>
                </>
              )}
              {viewOrder.status === "in_progress" && (
                <>
                  <button type="button" onClick={() => complete(viewOrder.id)} className={btnPrimary}>
                    Complete
                  </button>
                  <button type="button" onClick={() => patch(viewOrder.id, { status: "cancelled" })} className={btnSecondary}>
                    Cancel
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setViewOrder(null);
                  openEditModal(viewOrder);
                }}
                className={btnSecondary}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button type="button" onClick={() => remove(viewOrder.id)} className={btnDanger}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading work orders…</p>
      ) : !items.length ? (
        <EmptyState icon={ClipboardList} title="No work orders" text="Create your first work order to get started." />
      ) : !filtered.length ? (
        <EmptyState icon={ClipboardList} title="No matching work orders" text="Try adjusting your filters or search." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Vehicle</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Priority</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Due date</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Assigned to</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Total charge</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((order) => (
                  <tr key={order.id} className="bg-slate-950/20 transition hover:bg-slate-900/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatOrderNumber(order.id)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{order.customerName}</p>
                      <p className="text-xs text-slate-500 lg:hidden">{order.vehicle || "No vehicle"}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{order.vehicle || "—"}</td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-300">
                      <p className="truncate">{order.service}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={statusBadgeKey(order.status)} />
                        {isOverdue(order) && <StatusBadge status="overdue" />}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <StatusBadge status={order.priority === "urgent" ? "urgent" : "normal"} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-400 xl:table-cell">{formatDate(order.scheduledDate)}</td>
                    <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{staffName(order.assignedTo)}</td>
                    <td className="hidden px-4 py-3 text-emerald-300 xl:table-cell">${(order.revenue ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => setViewOrder(order)} className={btnSecondary} aria-label={`View ${order.customerName}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => openEditModal(order)} className={btnSecondary} aria-label={`Edit ${order.customerName}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => remove(order.id)} className={btnDanger} aria-label={`Delete ${order.customerName}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
