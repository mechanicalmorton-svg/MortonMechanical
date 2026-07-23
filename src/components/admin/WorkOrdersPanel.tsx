"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import type { WorkOrder } from "@/lib/shop-types";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

export function WorkOrdersPanel() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerName: "", phone: "", vehicle: "", service: "", priority: "normal", notes: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/work-orders");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/work-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ customerName: "", phone: "", vehicle: "", service: "", priority: "normal", notes: "" });
    load();
  }

  async function setStatus(id: string, status: WorkOrder["status"]) {
    await fetch("/api/admin/work-orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this work order?")) return;
    await fetch("/api/admin/work-orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Work Orders" subtitle="Track jobs from open to completion." />
        <button type="button" onClick={() => setShowForm(!showForm)} className={btnPrimary}><Plus className="h-4 w-4" /> New Work Order</button>
      </div>

      {showForm && (
        <form onSubmit={add} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2">
          <input className={inputClass} placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={inputClass} placeholder="Vehicle" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
          <input className={inputClass} placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required />
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="normal">Normal priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <textarea className={inputClass} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create work order</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

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
                  <p className="mt-0.5 text-xs text-slate-500">{w.phone} · {new Date(w.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {w.status === "open" && (
                    <button type="button" onClick={() => setStatus(w.id, "in_progress")} className={btnSecondary}>Start</button>
                  )}
                  {w.status === "in_progress" && (
                    <button type="button" onClick={() => setStatus(w.id, "completed")} className={btnPrimary}>Complete</button>
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
