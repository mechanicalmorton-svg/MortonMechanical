"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import type { StaffMember, WorkOrder } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

export function WorkOrdersPanel() {
  const toast = useAdminToast();
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    vehicle: "",
    service: "",
    priority: "normal",
    notes: "",
    assignedTo: "",
    scheduledDate: "",
  });

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

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error: message } = await adminSend("/api/admin/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (message) {
      toast.error(message);
      return;
    }
    setShowForm(false);
    setForm({ customerName: "", phone: "", vehicle: "", service: "", priority: "normal", notes: "", assignedTo: "", scheduledDate: "" });
    toast.success("Work order created.");
    load();
  }

  async function patch(id: string, patch: Partial<WorkOrder>) {
    const { error: message } = await adminSend("/api/admin/work-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (message) toast.error(message);
    else load();
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
  }

  async function remove(id: string) {
    if (!confirm("Delete this work order?")) return;
    const { error: message } = await adminSend("/api/admin/work-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else load();
  }

  function staffName(id?: string) {
    if (!id) return null;
    return staff.find((member) => member.id === id)?.name ?? id;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Work Orders" subtitle="Track jobs from open to completion." />
        <button type="button" onClick={() => setShowForm(true)} className={btnPrimary}><Plus className="h-4 w-4" /> New Work Order</button>
      </div>

      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="New Work Order" wide>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <input className={inputClass} placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={inputClass} placeholder="Vehicle" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
          <input className={inputClass} placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required />
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="normal">Normal priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <select className={inputClass} value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
            <option value="">Unassigned</option>
            {staff.filter((member) => member.active).map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <input className={inputClass} type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          <textarea className={`${inputClass} sm:col-span-2`} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create work order</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState icon={ClipboardList} title="No work orders" text="Create your first work order to get started." />
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <article key={w.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{w.customerName}</h3>
                    <StatusBadge status={w.status} />
                    {w.priority === "urgent" && <StatusBadge status="urgent" />}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{w.service} · {w.vehicle || "No vehicle listed"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {w.phone}
                    {w.assignedTo ? ` · ${staffName(w.assignedTo)}` : ""}
                    {w.scheduledDate ? ` · ${new Date(w.scheduledDate).toLocaleDateString()}` : ""}
                    {w.revenue != null ? ` · $${w.revenue.toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {w.status === "open" && (
                    <>
                      <button type="button" onClick={() => patch(w.id, { status: "in_progress" })} className={btnSecondary}>Start</button>
                      <button type="button" onClick={() => patch(w.id, { status: "cancelled" })} className={btnSecondary}>Cancel</button>
                    </>
                  )}
                  {w.status === "in_progress" && (
                    <>
                      <button type="button" onClick={() => complete(w.id)} className={btnPrimary}>Complete</button>
                      <button type="button" onClick={() => patch(w.id, { status: "cancelled" })} className={btnSecondary}>Cancel</button>
                    </>
                  )}
                  <button type="button" onClick={() => remove(w.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {w.notes && <p className="mt-3 rounded-lg bg-slate-950/50 p-3 text-sm text-slate-400">{w.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
