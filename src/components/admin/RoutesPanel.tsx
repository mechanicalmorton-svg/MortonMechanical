"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, Plus, Route, Trash2 } from "lucide-react";
import type { RoutePlan, RouteStop } from "@/lib/shop-types";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

type Props = { todayOnly?: boolean };

export function RoutesPanel({ todayOnly }: Props) {
  const [routes, setRoutes] = useState<RoutePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    stopName: "",
    stopAddress: "",
    stopTime: "10:00",
    stopService: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/routes");
    setRoutes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = todayOnly ? routes.filter((r) => r.date === today) : routes;

  async function createRoute(e: React.FormEvent) {
    e.preventDefault();
    const stop: RouteStop = {
      id: Date.now().toString(36),
      customerName: form.stopName,
      address: form.stopAddress,
      time: form.stopTime,
      service: form.stopService,
      completed: false,
    };
    await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.date, stops: [stop], status: "planned" }),
    });
    setShowForm(false);
    load();
  }

  async function toggleStop(routeId: string, stopId: string, stops: RouteStop[]) {
    const updated = stops.map((s) => (s.id === stopId ? { ...s, completed: !s.completed } : s));
    await fetch("/api/admin/routes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: routeId, stops: updated, status: updated.every((s) => s.completed) ? "completed" : "in_progress" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this route?")) return;
    await fetch("/api/admin/routes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={todayOnly ? "My Route Today" : "Route Manager"}
          subtitle={todayOnly ? "Your stops for today in order." : "Plan and manage daily mobile service routes."}
        />
        {!todayOnly && (
          <button type="button" onClick={() => setShowForm(!showForm)} className={btnPrimary}><Plus className="h-4 w-4" /> New Route</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createRoute} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2">
          <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inputClass} placeholder="Customer name" value={form.stopName} onChange={(e) => setForm({ ...form, stopName: e.target.value })} required />
          <input className={inputClass} placeholder="Address" value={form.stopAddress} onChange={(e) => setForm({ ...form, stopAddress: e.target.value })} required />
          <input className={inputClass} type="time" value={form.stopTime} onChange={(e) => setForm({ ...form, stopTime: e.target.value })} />
          <input className={inputClass} placeholder="Service" value={form.stopService} onChange={(e) => setForm({ ...form, stopService: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Create route</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading routes…</p>
      ) : !filtered.length ? (
        <EmptyState
          icon={Route}
          title={todayOnly ? "No route for today" : "No routes planned"}
          text={todayOnly ? "Your assigned stops will appear here." : "Create a route to organize mobile visits."}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((route) => (
            <article key={route.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{new Date(route.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
                  <p className="text-sm text-slate-500">{route.stops.length} stop{route.stops.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={route.status} />
                  {!todayOnly && (
                    <button type="button" onClick={() => remove(route.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
              <ol className="mt-4 space-y-2">
                {route.stops.map((stop, i) => (
                  <li
                    key={stop.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      stop.completed ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800/80 bg-slate-950/40"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${stop.completed ? "text-slate-500 line-through" : "text-white"}`}>{stop.customerName}</p>
                      <p className="flex items-center gap-1 text-sm text-slate-400">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{stop.address}</span>
                      </p>
                      <p className="text-xs text-slate-500">{stop.time} · {stop.service}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStop(route.id, stop.id, route.stops)}
                      className={`shrink-0 rounded-lg p-2 transition ${stop.completed ? "text-emerald-400" : "text-slate-500 hover:text-amber-400"}`}
                      aria-label={stop.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
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
