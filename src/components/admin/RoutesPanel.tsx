"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gauge, MapPin, Plus, Route, Trash2 } from "lucide-react";
import type { FleetVehicle, RoutePlan, RouteStop, StaffMember } from "@/lib/shop-types";
import { adminGet, adminSend, asStaffList } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

type Props = { todayOnly?: boolean; userId?: string };

export function RoutesPanel({ todayOnly, userId }: Props) {
  const toast = useAdminToast();
  const [routes, setRoutes] = useState<RoutePlan[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mileageDrafts, setMileageDrafts] = useState<Record<string, string>>({});
  const [savingMileageId, setSavingMileageId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    driverId: "",
    vehicleId: "",
    stopName: "",
    stopAddress: "",
    stopTime: "10:00",
    stopService: "",
  });

  async function load() {
    setLoading(true);
    const [routeRes, staffRes, fleetRes] = await Promise.all([
      adminGet<RoutePlan[]>("/api/admin/routes"),
      adminGet<StaffMember[] | { staff: StaffMember[] }>("/api/admin/staff"),
      adminGet<FleetVehicle[]>("/api/admin/fleet"),
    ]);
    if (routeRes.error) toast.error(routeRes.error);
    else setRoutes(routeRes.data ?? []);
    if (staffRes.error) toast.error(staffRes.error);
    else setStaff(asStaffList<StaffMember>(staffRes.data));
    if (fleetRes.error) toast.error(fleetRes.error);
    else setFleet(fleetRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = routes.filter((route) => {
    if (todayOnly && route.date !== today) return false;
    if (todayOnly && userId && route.driverId && route.driverId !== userId) return false;
    return true;
  });

  async function createRoute(e: React.FormEvent) {
    e.preventDefault();
    const stop: RouteStop = {
      id: crypto.randomUUID(),
      customerName: form.stopName,
      address: form.stopAddress,
      time: form.stopTime,
      service: form.stopService,
      completed: false,
    };
    const { error: message } = await adminSend("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        driverId: form.driverId || undefined,
        vehicleId: form.vehicleId || undefined,
        stops: [stop],
        status: "planned",
      }),
    });
    if (message) toast.error(message);
    else {
      setShowForm(false);
      toast.success("Route created.");
      load();
    }
  }

  async function toggleStop(routeId: string, stopId: string, stops: RouteStop[]) {
    const updated = stops.map((stop) => (stop.id === stopId ? { ...stop, completed: !stop.completed } : stop));
    const { error: message } = await adminSend("/api/admin/routes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: routeId,
        stops: updated,
        status: updated.every((stop) => stop.completed) ? "completed" : "in_progress",
      }),
    });
    if (message) toast.error(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this route?")) return;
    const { error: message } = await adminSend("/api/admin/routes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else load();
  }

  function mileageValueFor(route: RoutePlan) {
    if (mileageDrafts[route.id] !== undefined) return mileageDrafts[route.id];
    if (route.mileage != null) return String(route.mileage);
    const vehicle = fleet.find((item) => item.id === route.vehicleId);
    return vehicle?.mileage != null ? String(vehicle.mileage) : "";
  }

  async function saveMileage(route: RoutePlan) {
    if (!route.vehicleId) {
      toast.error("Assign a vehicle to this route before saving mileage.");
      return;
    }
    const raw = mileageValueFor(route).trim();
    const mileage = Number(raw.replace(/,/g, ""));
    if (!raw || !Number.isFinite(mileage) || mileage < 0) {
      toast.error("Enter a valid mileage reading.");
      return;
    }
    setSavingMileageId(route.id);
    const { error: message } = await adminSend("/api/admin/routes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: route.id, mileage }),
    });
    setSavingMileageId(null);
    if (message) toast.error(message);
    else {
      toast.success("Mileage saved to route, Fleet, and Vehicle Manager.");
      setMileageDrafts((prev) => {
        const next = { ...prev };
        delete next[route.id];
        return next;
      });
      load();
    }
  }

  function labelForStaff(id?: string) {
    if (!id) return "Unassigned";
    return staff.find((member) => member.id === id)?.name ?? "Unknown";
  }

  function labelForVehicle(id?: string) {
    if (!id) return "No vehicle";
    const vehicle = fleet.find((item) => item.id === id);
    return vehicle ? `${vehicle.name} (${vehicle.plate})` : "Unknown";
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={todayOnly ? "My Route Today" : "Route Manager"}
          subtitle={todayOnly ? "Routes assigned to you for today." : "Plan daily mobile service routes and assign drivers."}
        />
        {!todayOnly && (
          <Can permission="routes.create">
            <button type="button" onClick={() => setShowForm(true)} className={btnPrimary}><Plus className="h-4 w-4" /> New Route</button>
          </Can>
        )}
      </div>

      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="New Route" wide>
        <form onSubmit={createRoute} className="grid gap-3 sm:grid-cols-2">
          <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className={inputClass} value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
            <option value="">Assign driver</option>
            {staff.filter((member) => member.active).map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <select className={inputClass} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            <option value="">Assign vehicle</option>
            {fleet.filter((vehicle) => vehicle.status === "active").map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.name} ({vehicle.plate})</option>
            ))}
          </select>
          <input className={inputClass} placeholder="Customer name" value={form.stopName} onChange={(e) => setForm({ ...form, stopName: e.target.value })} required />
          <input className={inputClass} placeholder="Address" value={form.stopAddress} onChange={(e) => setForm({ ...form, stopAddress: e.target.value })} required />
          <input className={inputClass} type="time" value={form.stopTime} onChange={(e) => setForm({ ...form, stopTime: e.target.value })} />
          <input className={inputClass} placeholder="Service" value={form.stopService} onChange={(e) => setForm({ ...form, stopService: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create route</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading routes…</p>
      ) : !filtered.length ? (
        <EmptyState
          icon={Route}
          title={todayOnly ? "No route assigned today" : "No routes planned"}
          text={todayOnly ? "Routes assigned to you will appear here." : "Create a route to organize mobile visits."}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((route) => (
            <article key={route.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{new Date(route.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
                  <p className="text-sm text-slate-500">
                    {route.stops.length} stop{route.stops.length !== 1 ? "s" : ""} · {labelForStaff(route.driverId)} · {labelForVehicle(route.vehicleId)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={route.status} />
                  {!todayOnly && (
                    <Can permission="routes.delete">
                      <button type="button" onClick={() => remove(route.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                    </Can>
                  )}
                </div>
              </div>

              {route.vehicleId ? (
                <Can permission="routes.edit">
                  <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <div className="min-w-[10rem] flex-1">
                      <label className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                        <Gauge className="h-3 w-3" />
                        Vehicle mileage
                      </label>
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        placeholder="Odometer reading"
                        value={mileageValueFor(route)}
                        onChange={(e) =>
                          setMileageDrafts((prev) => ({ ...prev, [route.id]: e.target.value }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className={btnSecondary}
                      disabled={savingMileageId === route.id}
                      onClick={() => saveMileage(route)}
                    >
                      {savingMileageId === route.id ? "Saving…" : "Save mileage"}
                    </button>
                  </div>
                </Can>
              ) : null}

              <ol className="mt-4 space-y-2">
                {route.stops.map((stop, index) => (
                  <li
                    key={stop.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      stop.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800/80 bg-slate-950/40"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-400">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${stop.completed ? "text-slate-500 line-through" : "text-white"}`}>{stop.customerName}</p>
                      <p className="flex items-center gap-1 text-sm text-slate-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{stop.address}</span>
                      </p>
                      <p className="text-xs text-slate-500">{stop.time} · {stop.service}</p>
                    </div>
                    <Can permission="routes.edit">
                      <button
                        type="button"
                        onClick={() => toggleStop(route.id, stop.id, route.stops)}
                        className={`shrink-0 rounded-lg p-2 transition ${stop.completed ? "text-emerald-400" : "text-slate-500 hover:text-amber-400"}`}
                        aria-label={stop.completed ? "Mark incomplete" : "Mark complete"}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </Can>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
