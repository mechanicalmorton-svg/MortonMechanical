"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";
import type { Booking } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { EmptyState, ErrorBanner, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

export function BookingsPanel() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    service: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    address: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    const { data, error: message } = await adminGet<Booking[]>("/api/admin/bookings");
    if (message) setError(message);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (message) setError(message);
    else {
      setShowForm(false);
      load();
    }
  }

  async function setStatus(id: string, status: Booking["status"]) {
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (message) setError(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) setError(message);
    else load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Bookings" subtitle="Schedule and manage customer appointments." />
        <button type="button" onClick={() => setShowForm(true)} className={btnPrimary}><Plus className="h-4 w-4" /> New Booking</button>
      </div>
      <ErrorBanner message={error} />

      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="New Booking" wide>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <input className={inputClass} placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required />
          <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inputClass} type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <input className={inputClass} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea className={`${inputClass} sm:col-span-2`} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create booking</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState icon={Calendar} title="No bookings yet" text="Add appointments as you confirm jobs with customers." />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <article key={b.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{b.customerName}</h3>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{b.service}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(b.date).toLocaleDateString()} at {b.time}
                    {b.address ? ` · ${b.address}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.status === "pending" && (
                    <>
                      <button type="button" onClick={() => setStatus(b.id, "confirmed")} className={btnPrimary}>Confirm</button>
                      <button type="button" onClick={() => setStatus(b.id, "cancelled")} className={btnSecondary}>Cancel</button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <button type="button" onClick={() => setStatus(b.id, "completed")} className={btnSecondary}>Complete</button>
                      <button type="button" onClick={() => setStatus(b.id, "cancelled")} className={btnSecondary}>Cancel</button>
                    </>
                  )}
                  <button type="button" onClick={() => remove(b.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
