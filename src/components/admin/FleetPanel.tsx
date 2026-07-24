"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import type { FleetStatus, FleetVehicle } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { EmptyState, ErrorBanner, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { SearchableSelect } from "./SearchableSelect";

const VEHICLE_TYPES = ["Service Van", "Pickup Truck", "Box Truck", "SUV", "Car", "Trailer", "Other"];
const YEARS = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => String(new Date().getFullYear() - i));

const emptyForm = {
  name: "",
  plate: "",
  type: "Service Van",
  make: "",
  model: "",
  year: "",
  mileage: "",
  lastService: "",
  status: "active" as FleetStatus,
};

export function FleetPanel() {
  const [items, setItems] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const { data, error: message } = await adminGet<FleetVehicle[]>("/api/admin/fleet");
    if (message) setError(message);
    else setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setLoadingMakes(true);
    adminGet<string[]>("/api/admin/vehicles/makes")
      .then(({ data, error: message }) => {
        if (message) setError(message);
        else setMakes(data ?? []);
      })
      .finally(() => setLoadingMakes(false));
  }, []);

  useEffect(() => {
    if (!form.make.trim()) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    const params = new URLSearchParams({ make: form.make });
    if (form.year) params.set("year", form.year);
    adminGet<string[]>(`/api/admin/vehicles/models?${params}`)
      .then(({ data, error: message }) => {
        if (message) setError(message);
        else setModels(data ?? []);
      })
      .finally(() => setLoadingModels(false));
  }, [form.make, form.year]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      ...form,
      year: form.year ? Number(form.year) : undefined,
      mileage: form.mileage ? Number(form.mileage) : undefined,
    };
    const { error: message } = await adminSend("/api/admin/fleet", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (message) setError(message);
    else {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    }
  }

  function startEdit(vehicle: FleetVehicle) {
    setEditingId(vehicle.id);
    setForm({
      name: vehicle.name,
      plate: vehicle.plate,
      type: vehicle.type,
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      year: vehicle.year ? String(vehicle.year) : "",
      mileage: vehicle.mileage ? String(vehicle.mileage) : "",
      lastService: vehicle.lastService ?? "",
      status: vehicle.status,
    });
    setShowForm(true);
  }

  async function updateStatus(id: string, status: FleetStatus) {
    const { error: message } = await adminSend("/api/admin/fleet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (message) setError(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this vehicle?")) return;
    const { error: message } = await adminSend("/api/admin/fleet", {
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
        <PageHeader title="Fleet Management" subtitle="Track mobile service vans and vehicle maintenance." />
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShowForm(!showForm);
          }}
          className={btnPrimary}
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>
      <ErrorBanner message={error} />

      {showForm && (
        <form onSubmit={save} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className={inputClass} placeholder="Vehicle name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} placeholder="Plate" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required />
          <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <label className="block text-sm text-slate-400">
            Make
            <SearchableSelect
              value={form.make}
              onChange={(make) => setForm({ ...form, make, model: "" })}
              options={makes}
              loading={loadingMakes}
              placeholder="Search make…"
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block text-sm text-slate-400">
            Model
            <SearchableSelect
              value={form.model}
              onChange={(model) => setForm({ ...form, model })}
              options={models}
              loading={loadingModels}
              disabled={!form.make.trim()}
              placeholder={form.make ? "Search model…" : "Select make first"}
              className={`${inputClass} mt-1`}
            />
          </label>
          <select className={inputClass} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value, model: "" })}>
            <option value="">Year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <input className={inputClass} type="number" placeholder="Mileage" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          <input className={inputClass} type="date" value={form.lastService} onChange={(e) => setForm({ ...form, lastService: e.target.value })} />
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FleetStatus })}>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
          <div className="flex gap-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>{editingId ? "Save changes" : "Add vehicle"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState icon={Truck} title="No fleet vehicles" text="Add your mobile service units." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((vehicle) => (
            <article key={vehicle.id} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-pink-600" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{vehicle.name}</p>
                    <p className="text-sm text-slate-400">{vehicle.plate} · {vehicle.type}</p>
                    {(vehicle.make || vehicle.model) && (
                      <p className="mt-1 text-xs text-slate-500">{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-slate-500">Mileage</dt><dd className="text-slate-300">{vehicle.mileage?.toLocaleString() ?? "—"}</dd></div>
                  <div><dt className="text-xs text-slate-500">Last service</dt><dd className="text-slate-300">{vehicle.lastService ? new Date(vehicle.lastService).toLocaleDateString() : "—"}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <select className={inputClass} value={vehicle.status} onChange={(e) => updateStatus(vehicle.id, e.target.value as FleetStatus)}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                  <button type="button" onClick={() => startEdit(vehicle)} className={btnSecondary}>Edit</button>
                  <button type="button" onClick={() => remove(vehicle.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
