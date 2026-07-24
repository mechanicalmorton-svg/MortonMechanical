"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Trash2, UserRound } from "lucide-react";
import type { Booking } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { CustomerPickerModal, type CustomerWithVehicles } from "./CustomerPickerModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

const emptyForm = {
  customerId: "",
  customerName: "",
  phone: "",
  email: "",
  service: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  address: "",
  notes: "",
};

export function BookingsPanel() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const { data, error: message } = await adminGet<Booking[]>("/api/admin/bookings");
    if (message) toast.error(message);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  }

  function handleCustomerSelect(customer: CustomerWithVehicles) {
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? prev.address,
    }));
    setPickerOpen(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error("Select or enter a customer with a phone number.");
      return;
    }
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (message) toast.error(message);
    else {
      setShowForm(false);
      toast.success("Booking saved to the database.");
      load();
    }
  }

  async function setStatus(id: string, status: Booking["status"]) {
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (message) toast.error(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bookings"
          subtitle="Live appointments from your customers and website requests (Supabase)."
        />
        <button type="button" onClick={openCreate} className={btnPrimary}>
          <Plus className="h-4 w-4" /> New Booking
        </button>
      </div>

      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="New Booking" wide>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {form.customerId || form.customerName ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{form.customerName}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[form.email, form.phone].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setPickerOpen(true)} className={btnSecondary}>
                  Change
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setPickerOpen(true)} className={`${btnSecondary} w-full justify-center py-3`}>
                Select customer
              </button>
            )}
          </div>
          <input
            className={inputClass}
            placeholder="Customer name"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value, customerId: "" })}
            required
          />
          <input
            className={inputClass}
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} placeholder="Service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} required />
          <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inputClass} type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <input className={`${inputClass} sm:col-span-2`} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea className={`${inputClass} sm:col-span-2`} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create booking</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      <CustomerPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleCustomerSelect} stacked />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState
          icon={Calendar}
          title="No bookings yet"
          text="Website contact requests and manually scheduled appointments will appear here from Supabase."
        />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <article key={b.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{b.customerName}</h3>
                    <StatusBadge status={b.status} />
                    {b.quoteId ? (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30">
                        Website
                      </span>
                    ) : null}
                    {b.customerId ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/20">
                        Customer linked
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{b.service}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(b.date).toLocaleDateString()} at {b.time}
                    {b.address ? ` · ${b.address}` : ""}
                    {b.phone ? ` · ${b.phone}` : ""}
                  </p>
                  {b.notes ? <p className="mt-2 text-sm text-slate-500">{b.notes}</p> : null}
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
