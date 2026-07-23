"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import type { StaffMember, StaffRole } from "@/lib/shop-types";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

export function StaffPanel() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "mechanic" as StaffRole });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/staff");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ name: "", email: "", phone: "", role: "mechanic" });
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this team member?")) return;
    await fetch("/api/admin/staff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="User Management" subtitle="Manage mechanics, dispatchers, and shop staff." />
        <button type="button" onClick={() => setShowForm(!showForm)} className={btnPrimary}><Plus className="h-4 w-4" /> Add User</button>
      </div>

      {showForm && (
        <form onSubmit={add} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2">
          <input className={inputClass} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="mechanic">Mechanic</option>
            <option value="dispatcher">Dispatcher</option>
          </select>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Add team member</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState icon={Users} title="No team members" text="Add your shop staff to assign jobs and routes." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((s) => (
            <article key={s.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-pink-600/20 text-sm font-bold text-amber-300">
                    {s.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{s.name}</p>
                    <p className="text-sm text-slate-400">{s.email}</p>
                    <p className="text-xs capitalize text-slate-500">{s.role} · {s.phone}</p>
                  </div>
                </div>
                <StatusBadge status={s.active ? "active" : "retired"} />
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => toggleActive(s.id, !s.active)} className={btnSecondary}>
                  {s.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => remove(s.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
