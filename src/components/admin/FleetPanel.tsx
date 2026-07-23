"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import type { FleetVehicle, FleetStatus } from "@/lib/shop-types";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

export function FleetPanel() {
  const [items, setItems] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", plate: "", type: "Service Van", make: "", model: "", year: "", mileage: "", status: "active" as FleetStatus });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/fleet");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : undefined, mileage: form.mileage ? Number(form.mileage) : undefined }),
    });
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this vehicle?")) return;
    await fetch("/api/admin/fleet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Fleet Management" subtitle="Track mobile service vans and vehicle maintenance." />
        <button type="button" onClick={() => setShowForm(!showForm)} className={btnPrimary}><Plus className="h-4 w-4" /> Add Vehicle</button>
      </div>

      {showForm && (
        <form onSubmit={add} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className={inputClass} placeholder="Vehicle name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} placeholder="Plate" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required />
          <input className={inputClass} placeholder="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <input className={inputClass} placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          <input className={inputClass} placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input className={inputClass} type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <input className={inputClass} type="number" placeholder="Mileage" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FleetStatus })}>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
          <div className="flex gap-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>Add vehicle</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState icon={Truck} title="No fleet vehicles" text="Add your mobile service units." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((v) => (
            <article key={v.id} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-pink-600" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{v.name}</p>
                    <p className="text-sm text-slate-400">{v.plate} · {v.type}</p>
                    {(v.make || v.model) && (
                      <p className="mt-1 text-xs text-slate-500">{[v.year, v.make, v.model].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-slate-500">Mileage</dt><dd className="text-slate-300">{v.mileage?.toLocaleString() ?? "—"}</dd></div>
                  <div><dt className="text-xs text-slate-500">Last service</dt><dd className="text-slate-300">{v.lastService ?? "—"}</dd></div>
                </dl>
                <button type="button" onClick={() => remove(v.id)} className={`${btnDanger} mt-4`}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
