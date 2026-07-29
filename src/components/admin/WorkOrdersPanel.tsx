"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Package,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import type { InventoryItem, StaffMember, WorkOrder, WorkOrderDocumentKind, WorkOrderStatus } from "@/lib/shop-types";
import {
  WORK_ORDER_DONE_STATUSES,
  WORK_ORDER_IN_SHOP_STATUSES,
  WORK_ORDER_QUEUED_STATUSES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  isWorkOrderClosed,
} from "@/lib/work-order-status";
import {
  PART_ROW_COUNT,
  getWorkOrderParts,
  partLineTotal,
  resolveDocumentFields,
} from "@/lib/work-order-documents";
import { adminGet, adminSend, asStaffList } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { WorkOrderDocumentEditor } from "./WorkOrderDocumentEditor";
import { WorkOrderFormModal } from "./WorkOrderFormModal";
import { InventoryPartPickerModal } from "./InventoryPartPickerModal";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

const actionBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/50 text-slate-200 shadow-sm transition hover:border-amber-500/40 hover:bg-slate-800/70 hover:text-amber-100 active:scale-[0.98]";

const docActionBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-200 transition hover:border-cyan-500/35 hover:bg-slate-800/80 hover:text-cyan-100 active:scale-[0.98]";

type StatusFilter = "queued" | "in_shop" | "done" | "invoice_unpaid" | "invoice_paid" | "overdue" | WorkOrderStatus | null;

const WORK_ORDER_GROUPS: {
  id: string;
  label: string;
  match: (order: WorkOrder) => boolean;
}[] = [
  {
    id: "queued",
    label: "Draft / Scheduled",
    match: (order) => WORK_ORDER_QUEUED_STATUSES.includes(order.status),
  },
  {
    id: "in_shop",
    label: "In Shop",
    match: (order) => WORK_ORDER_IN_SHOP_STATUSES.includes(order.status),
  },
  {
    id: "done",
    label: "Completed / Delivered",
    match: (order) => WORK_ORDER_DONE_STATUSES.includes(order.status),
  },
  {
    id: "cancelled",
    label: "Cancelled",
    match: (order) => order.status === "cancelled",
  },
];

function invoicePaymentStatus(order: WorkOrder): "paid" | "unpaid" {
  return order.paymentStatus === "paid" ? "paid" : "unpaid";
}

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
  if (!order.scheduledDate || isWorkOrderClosed(order.status)) return false;
  const due = new Date(order.scheduledDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
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
  const [documentEditor, setDocumentEditor] = useState<{
    kind: WorkOrderDocumentKind;
    order: WorkOrder;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [payNowLoadingId, setPayNowLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [createdOn, setCreatedOn] = useState("");
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [addingPart, setAddingPart] = useState(false);

  async function load() {
    setLoading(true);
    const [orders, team] = await Promise.all([
      adminGet<WorkOrder[]>("/api/admin/work-orders"),
      adminGet<StaffMember[] | { staff: StaffMember[] }>("/api/admin/staff"),
    ]);
    if (orders.error) toast.error(orders.error);
    else setItems(orders.data ?? []);
    if (team.error) toast.error(team.error);
    else setStaff(asStaffList<StaffMember>(team.data));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pendingPaymentKey = useMemo(
    () =>
      items
        .filter((order) => (order.paymentStatus ?? "unpaid") !== "paid" && Boolean(order.stripeCheckoutSessionId))
        .map((order) => order.id)
        .sort()
        .join(","),
    [items],
  );

  useEffect(() => {
    if (!pendingPaymentKey) return;
    let cancelled = false;

    async function refreshPayments() {
      // Ask Stripe directly about open Checkout sessions, then refresh the list.
      await adminSend("/api/admin/payments/sync-pending", { method: "POST" });
      if (cancelled) return;

      const { data, error } = await adminGet<WorkOrder[]>("/api/admin/work-orders");
      if (cancelled || error || !data) return;

      setItems((prev) => {
        const newlyPaid = data.filter(
          (next) =>
            next.paymentStatus === "paid" &&
            prev.some((old) => old.id === next.id && (old.paymentStatus ?? "unpaid") !== "paid"),
        );
        if (newlyPaid.length) {
          queueMicrotask(() => {
            for (const order of newlyPaid) {
              toast.success(`Payment received — ${order.customerName} is now Paid.`);
            }
          });
        }
        return data;
      });

      setViewOrder((current) => {
        if (!current) return current;
        return data.find((order) => order.id === current.id) ?? current;
      });
    }

    const quick = window.setTimeout(() => {
      void refreshPayments();
    }, 1000);
    const interval = window.setInterval(() => {
      void refreshPayments();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(quick);
      window.clearInterval(interval);
    };
  }, [pendingPaymentKey, toast]);

  const counts = useMemo(
    () => ({
      queued: items.filter((w) => WORK_ORDER_QUEUED_STATUSES.includes(w.status)).length,
      inShop: items.filter((w) => WORK_ORDER_IN_SHOP_STATUSES.includes(w.status)).length,
      done: items.filter((w) => WORK_ORDER_DONE_STATUSES.includes(w.status)).length,
      invoiceUnpaid: items.filter((w) => invoicePaymentStatus(w) !== "paid").length,
      invoicePaid: items.filter((w) => invoicePaymentStatus(w) === "paid").length,
      overdue: items.filter(isOverdue).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((order) => {
      if (statusFilter === "queued" && !WORK_ORDER_QUEUED_STATUSES.includes(order.status)) return false;
      if (statusFilter === "in_shop" && !WORK_ORDER_IN_SHOP_STATUSES.includes(order.status)) return false;
      if (statusFilter === "done" && !WORK_ORDER_DONE_STATUSES.includes(order.status)) return false;
      if (statusFilter === "invoice_unpaid" && invoicePaymentStatus(order) === "paid") return false;
      if (statusFilter === "invoice_paid" && invoicePaymentStatus(order) !== "paid") return false;
      if (statusFilter === "overdue" && !isOverdue(order)) return false;
      if (
        statusFilter &&
        statusFilter !== "queued" &&
        statusFilter !== "in_shop" &&
        statusFilter !== "done" &&
        statusFilter !== "invoice_unpaid" &&
        statusFilter !== "invoice_paid" &&
        statusFilter !== "overdue" &&
        order.status !== statusFilter
      ) {
        return false;
      }

      if (filterAssigned && order.assignedTo !== filterAssigned) return false;

      if (createdOn) {
        const createdDay = order.createdAt?.slice(0, 10);
        if (createdDay !== createdOn) return false;
      }

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
  }, [items, statusFilter, search, filterAssigned, createdOn]);

  const grouped = useMemo(() => {
    if (statusFilter === "overdue") {
      return filtered.length
        ? [{ id: "overdue", label: "Overdue", items: filtered }]
        : [];
    }

    return WORK_ORDER_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      items: filtered.filter(group.match),
    })).filter((group) => group.items.length > 0);
  }, [filtered, statusFilter]);

  function staffName(id?: string) {
    if (!id) return "—";
    return staff.find((member) => member.id === id)?.name ?? "—";
  }

  function openDocument(kind: WorkOrderDocumentKind, order: WorkOrder) {
    setDocumentEditor({ kind, order });
  }

  async function addInventoryPartToWorkOrder(item: InventoryItem, qty: number) {
    if (!viewOrder) return;
    setAddingPart(true);
    try {
      const fields = resolveDocumentFields(viewOrder, "work-order", {
        advisorName: staffName(viewOrder.assignedTo),
      });
      const parts = fields.parts.map((line) => ({ ...line }));
      const sameIdx = parts.findIndex(
        (line) =>
          (line.inventoryId && line.inventoryId === item.id) ||
          (Boolean(line.description || line.partNumber) &&
            line.description.trim().toLowerCase() === item.name.trim().toLowerCase() &&
            (line.partNumber || "").trim().toLowerCase() ===
              (item.partNumber || item.sku || "").trim().toLowerCase()),
      );
      const emptyIdx = parts.findIndex(
        (line) => !line.description.trim() && !line.partNumber.trim() && (line.qty == null || line.qty === 0),
      );

      if (sameIdx >= 0) {
        parts[sameIdx] = {
          ...parts[sameIdx],
          qty: (parts[sameIdx].qty ?? 0) + qty,
          unitPrice: parts[sameIdx].unitPrice ?? item.sellPrice,
          inventoryId: parts[sameIdx].inventoryId || item.id,
        };
      } else if (emptyIdx >= 0) {
        parts[emptyIdx] = {
          qty,
          description: item.name,
          partNumber: item.partNumber || item.sku || "",
          unitPrice: item.sellPrice ?? 0,
          inventoryId: item.id,
        };
      } else {
        toast.error(`Work order part list is full (${PART_ROW_COUNT} lines). Open Work order to edit lines.`);
        return;
      }

      const documentData = {
        ...(viewOrder.documentData ?? {}),
        documents: {
          ...(viewOrder.documentData?.documents ?? {}),
          "work-order": {
            ...fields,
            parts,
          },
        },
      };

      const { data, error } = await adminSend<WorkOrder>("/api/admin/work-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: viewOrder.id, documentData }),
      });
      if (error) {
        toast.error(error);
        return;
      }

      const { error: stockError } = await adminSend("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          quantity: Math.max(0, item.quantity - qty),
        }),
      });
      if (stockError) {
        toast.error(`Part added to work order, but stock update failed: ${stockError}`);
      } else {
        toast.success(`Added ${qty}× ${item.name} and pulled from inventory.`);
      }

      const updated = data ?? { ...viewOrder, documentData };
      setViewOrder(updated);
      setItems((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      if (documentEditor?.order.id === updated.id) {
        setDocumentEditor({ ...documentEditor, order: updated });
      }
    } finally {
      setAddingPart(false);
    }
  }

  function toggleStatusFilter(next: StatusFilter) {
    setStatusFilter((current) => (current === next ? null : next));
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

  async function patch(id: string, next: Partial<WorkOrder>) {
    const { error: message } = await adminSend("/api/admin/work-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...next }),
    });
    if (message) toast.error(message);
    else {
      toast.success("Work order updated.");
      load();
    }
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

  async function createPayNowLink(order: WorkOrder) {
    if (!(Number(order.revenue) > 0)) {
      toast.error("Set a Total charge greater than $0 before creating a Pay Now link.");
      return;
    }
    if (order.paymentStatus === "paid") {
      toast.error("This work order is already paid.");
      return;
    }
    setPayNowLoadingId(order.id);
    const { data, error: message } = await adminSend<{ checkoutUrl?: string }>("/api/admin/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workOrderId: order.id }),
    });
    setPayNowLoadingId(null);
    if (message) {
      toast.error(message);
      return;
    }
    const url = data?.checkoutUrl;
    if (!url) {
      toast.error("No checkout URL returned.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Stripe invoice link copied. Opening Checkout…");
    } catch {
      toast.success("Stripe invoice link ready.");
    }
    window.open(url, "_blank", "noopener,noreferrer");
    // Soft refresh so stripeCheckoutSessionId is present and live payment polling starts.
    const refreshed = await adminGet<WorkOrder[]>("/api/admin/work-orders");
    if (!refreshed.error && refreshed.data) {
      setItems(refreshed.data);
      setViewOrder((current) => {
        if (!current || current.id !== order.id) return current;
        return refreshed.data?.find((item) => item.id === order.id) ?? current;
      });
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
          <Can permission="work_orders.create">
            <button type="button" onClick={openCreateModal} className={btnPrimary}>
              <Plus className="h-4 w-4" /> New Work Order
            </button>
          </Can>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <FilterStatCard
          label="Draft / Scheduled"
          value={counts.queued}
          icon={Clock}
          accent="blue"
          active={statusFilter === "queued"}
          onClick={() => toggleStatusFilter("queued")}
        />
        <FilterStatCard
          label="In Shop"
          value={counts.inShop}
          icon={AlertTriangle}
          accent="amber"
          active={statusFilter === "in_shop"}
          onClick={() => toggleStatusFilter("in_shop")}
        />
        <FilterStatCard
          label="Completed / Delivered"
          value={counts.done}
          icon={CheckCircle2}
          accent="emerald"
          active={statusFilter === "done"}
          onClick={() => toggleStatusFilter("done")}
        />
        <FilterStatCard
          label="Unpaid"
          value={counts.invoiceUnpaid}
          icon={Receipt}
          accent="amber"
          active={statusFilter === "invoice_unpaid"}
          onClick={() => toggleStatusFilter("invoice_unpaid")}
        />
        <FilterStatCard
          label="Paid"
          value={counts.invoicePaid}
          icon={CreditCard}
          accent="emerald"
          active={statusFilter === "invoice_paid"}
          onClick={() => toggleStatusFilter("invoice_paid")}
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
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)_minmax(14rem,0.9fr)_minmax(12rem,0.7fr)]">
          <label className="relative block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Search
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className={`${inputClass} pl-10`}
                placeholder="Search work orders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status
            </span>
            <select
              className={inputClass}
              value={
                statusFilter &&
                statusFilter !== "queued" &&
                statusFilter !== "in_shop" &&
                statusFilter !== "done" &&
                statusFilter !== "invoice_unpaid" &&
                statusFilter !== "invoice_paid" &&
                statusFilter !== "overdue"
                  ? statusFilter
                  : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                setStatusFilter(value ? (value as WorkOrderStatus) : null);
              }}
            >
              <option value="">All statuses</option>
              {WORK_ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {WORK_ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Technician
            </span>
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/80" />
              <select
                className={`${inputClass} appearance-none pl-10 pr-10 ${
                  filterAssigned ? "border-amber-500/35 text-amber-50" : ""
                }`}
                value={filterAssigned}
                onChange={(e) => setFilterAssigned(e.target.value)}
              >
                <option value="">All technicians</option>
                {staff
                  .filter((member) => member.active)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Created on
            </span>
            <input
              className={inputClass}
              type="date"
              value={createdOn}
              onChange={(e) => setCreatedOn(e.target.value)}
            />
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
            onOrderUpdated={(updated) => {
              setItems((current) => current.map((order) => (order.id === updated.id ? updated : order)));
              setEditingOrder(updated);
              if (viewOrder?.id === updated.id) setViewOrder(updated);
            }}
            editingOrder={editingOrder}
            staff={staff}
          />
        ) : null}
      </AdminModal>

      {documentEditor ? (
        <WorkOrderDocumentEditor
          open
          kind={documentEditor.kind}
          order={documentEditor.order}
          advisorName={staffName(documentEditor.order.assignedTo)}
          onClose={() => setDocumentEditor(null)}
          onSaved={(updated) => {
            setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setDocumentEditor((current) =>
              current && current.order.id === updated.id ? { ...current, order: updated } : current,
            );
            if (viewOrder?.id === updated.id) setViewOrder(updated);
          }}
        />
      ) : null}

      <InventoryPartPickerModal
        open={showPartPicker && Boolean(viewOrder)}
        stacked
        busy={addingPart}
        onClose={() => setShowPartPicker(false)}
        onPick={addInventoryPartToWorkOrder}
      />

      <AdminModal open={!!viewOrder} onClose={() => { setShowPartPicker(false); setViewOrder(null); }} title={viewOrder ? formatOrderNumber(viewOrder.id) : "Work Order"} wide>
        {viewOrder && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={viewOrder.status} />
              <StatusBadge status={invoicePaymentStatus(viewOrder)} />
              <StatusBadge status={viewOrder.priority === "urgent" ? "urgent" : "normal"} />
              {isOverdue(viewOrder) && <StatusBadge status="overdue" />}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {viewOrder.bookingId ? (
                <div className="sm:col-span-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
                  From booking — linked appointment drives this work order.
                </div>
              ) : null}
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
                <dt className="text-xs uppercase tracking-wide text-slate-500">Total charge</dt>
                <dd className="mt-1 text-sm text-emerald-300">${(viewOrder.revenue ?? 0).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Invoice</dt>
                <dd className="mt-1 text-sm capitalize text-slate-300">
                  {invoicePaymentStatus(viewOrder) === "paid" ? "Paid" : "Unpaid"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Due date</dt>
                <dd className="mt-1 text-sm text-slate-300">{formatDate(viewOrder.scheduledDate)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Description</dt>
                <dd className="mt-1 text-sm text-slate-300">{viewOrder.service}</dd>
              </div>
              {(() => {
                const parts = getWorkOrderParts(viewOrder);
                if (!parts.length) return null;
                return (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Parts</dt>
                    <dd className="mt-2 overflow-hidden rounded-xl border border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2 font-medium">Qty</th>
                            <th className="px-3 py-2 font-medium">Part</th>
                            <th className="px-3 py-2 font-medium">#</th>
                            <th className="px-3 py-2 text-right font-medium">Line</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {parts.map(({ index, line }) => (
                            <tr key={`${index}-${line.partNumber}-${line.description}`} className="text-slate-300">
                              <td className="px-3 py-2 tabular-nums">{line.qty ?? "—"}</td>
                              <td className="px-3 py-2">{line.description || "—"}</td>
                              <td className="px-3 py-2 text-slate-400">{line.partNumber || "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-emerald-300">
                                ${partLineTotal(line).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </dd>
                  </div>
                );
              })()}
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
              <Can permission={["work_orders.view", "work_orders.document.edit"]} mode="any">
                <button type="button" onClick={() => openDocument("work-order", viewOrder)} className={btnSecondary}>
                  <ClipboardList className="h-3.5 w-3.5" /> Work order
                </button>
                <button type="button" onClick={() => openDocument("estimate", viewOrder)} className={btnSecondary}>
                  <FileText className="h-3.5 w-3.5" /> Estimate
                </button>
              </Can>
              <Can permission={["inventory.view", "work_orders.document.edit"]} mode="all">
                <button
                  type="button"
                  onClick={() => setShowPartPicker(true)}
                  className={btnSecondary}
                  disabled={addingPart}
                >
                  <Package className="h-3.5 w-3.5" /> Add parts
                </button>
              </Can>
              {invoicePaymentStatus(viewOrder) === "paid" ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
                  <CreditCard className="h-3.5 w-3.5" />
                  Paid
                </span>
              ) : (
                <Can permission={["payments.manage", "work_orders.payments.link"]} mode="any">
                  <button
                    type="button"
                    onClick={() => createPayNowLink(viewOrder)}
                    className={btnPrimary}
                    disabled={payNowLoadingId === viewOrder.id || !(Number(viewOrder.revenue) > 0)}
                    title={Number(viewOrder.revenue) > 0 ? "Create Stripe invoice payment link" : "Set Total charge before invoicing"}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {payNowLoadingId === viewOrder.id ? "Creating…" : "Stripe invoice"}
                  </button>
                </Can>
              )}
              <Can permission="work_orders.edit">
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
              </Can>
              <Can permission="work_orders.delete">
                <button type="button" onClick={() => remove(viewOrder.id)} className={btnDanger}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </Can>
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
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.id} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{group.label}</h2>
                  <p className="text-xs text-slate-500">
                    {group.items.length} work order{group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/30 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="hidden px-4 py-3 lg:table-cell">Vehicle</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Job status</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="hidden px-4 py-3 md:table-cell">Priority</th>
                      <th className="hidden px-4 py-3 xl:table-cell">Due date</th>
                      <th className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">Assigned to</th>
                      <th className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">Total charge</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {group.items.map((order) => (
                      <tr key={order.id} className="bg-slate-950/20 transition hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{formatOrderNumber(order.id)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{order.customerName}</p>
                          <p className="text-xs text-slate-500 lg:hidden">{order.vehicle || "No vehicle"}</p>
                          {order.bookingId ? (
                            <p className="mt-0.5 text-[11px] text-indigo-300/90">From booking</p>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{order.vehicle || "—"}</td>
                        <td className="max-w-[220px] px-4 py-3 text-slate-300">
                          <p className="truncate">{order.service}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge status={order.status} />
                            {isOverdue(order) && <StatusBadge status="overdue" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={invoicePaymentStatus(order)} />
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <StatusBadge status={order.priority === "urgent" ? "urgent" : "normal"} />
                        </td>
                        <td className="hidden px-4 py-3 text-slate-400 xl:table-cell">{formatDate(order.scheduledDate)}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-slate-400 lg:table-cell">
                          {staffName(order.assignedTo)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 font-medium text-emerald-300 lg:table-cell">
                          ${(order.revenue ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-nowrap items-center justify-end gap-1.5">
                            <button type="button" onClick={() => setViewOrder(order)} className={actionBtn} title="View" aria-label={`View ${order.customerName}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <Can permission="work_orders.edit">
                              <button type="button" onClick={() => openEditModal(order)} className={actionBtn} title="Edit" aria-label={`Edit ${order.customerName}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </Can>
                            <div className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-xl border border-slate-700/60 bg-slate-950/40 px-0.5">
                              <button
                                type="button"
                                onClick={() => openDocument("work-order", order)}
                                className={docActionBtn}
                                title="Work order"
                                aria-label={`Open work order for ${order.customerName}`}
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDocument("estimate", order)}
                                className={docActionBtn}
                                title="Estimate"
                                aria-label={`Open estimate for ${order.customerName}`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                              {order.paymentStatus === "paid" ? (
                                <span
                                  className="inline-flex h-8 w-8 items-center justify-center text-emerald-300"
                                  title="Invoice paid"
                                  aria-label={`Invoice paid for ${order.customerName}`}
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <Can permission={["payments.manage", "work_orders.payments.link"]} mode="any">
                                  <button
                                    type="button"
                                    onClick={() => createPayNowLink(order)}
                                    className={docActionBtn}
                                    title={Number(order.revenue) > 0 ? "Stripe invoice" : "Set Total charge before invoicing"}
                                    aria-label={`Create Stripe invoice for ${order.customerName}`}
                                    disabled={payNowLoadingId === order.id || !(Number(order.revenue) > 0)}
                                  >
                                    <Receipt className="h-3.5 w-3.5" />
                                  </button>
                                </Can>
                              )}
                            </div>
                            <Can permission="work_orders.delete">
                              <button type="button" onClick={() => remove(order.id)} className={btnDanger} title="Delete" aria-label={`Delete ${order.customerName}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
