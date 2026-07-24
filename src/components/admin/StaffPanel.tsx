"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import type { StaffMember, StaffRole } from "@/lib/shop-types";
import { AdminModal } from "./AdminModal";
import { EmptyState, ErrorBanner, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

function formatWhen(value?: string | null) {
  if (!value) return "Never signed in";
  return new Date(value).toLocaleString();
}

export function StaffPanel() {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "mechanic" as StaffRole,
  });

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/staff");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load users.");
      setItems([]);
    } else {
      setItems(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not create user.");
      return;
    }
    setShowForm(false);
    setForm({ name: "", email: "", password: "", phone: "", role: "mechanic" });
    load();
  }

  async function updateMember(id: string, patch: Partial<StaffMember>) {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    setError("");
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...current, ...patch }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update user.");
      return;
    }
    load();
  }

  async function remove(id: string, email: string) {
    if (!confirm(`Delete ${email} from Supabase Authentication? They will lose portal access.`)) return;
    setError("");
    const res = await fetch("/api/admin/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete user.");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="User Management"
          subtitle="Portal users are synced with Supabase Authentication (@mortonsmechanical.com)."
        />
        <button type="button" onClick={() => setShowForm(true)} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <ErrorBanner message={error} />

      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Add Portal User" wide>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <input className={inputClass} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} placeholder="Email (@mortonsmechanical.com)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className={inputClass} placeholder="Temporary password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
          <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="mechanic">Mechanic</option>
            <option value="dispatcher">Dispatcher</option>
          </select>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create Supabase user</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState
          icon={Users}
          title="No portal users yet"
          text="Add a @mortonsmechanical.com user here or create one in Supabase Authentication — they will appear automatically."
        />
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
                    <p className="text-xs text-slate-500">{s.phone || "No phone"} · Last sign-in: {formatWhen(s.lastSignIn)}</p>
                  </div>
                </div>
                <StatusBadge status={s.active ? "active" : "retired"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  className={inputClass}
                  value={s.role}
                  onChange={(e) => updateMember(s.id, { role: e.target.value as StaffRole })}
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="mechanic">Mechanic</option>
                  <option value="dispatcher">Dispatcher</option>
                </select>
                <button type="button" onClick={() => updateMember(s.id, { active: !s.active })} className={btnSecondary}>
                  {s.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => remove(s.id, s.email)} className={btnDanger}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
