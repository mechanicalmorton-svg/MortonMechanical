"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Package, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import type { VmActivity, VmPart, VmServiceOrder, VmVehicle } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

const YEARS = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => String(new Date().getFullYear() - i));

const emptyVehicle = { vehicleNumber: "", year: String(new Date().getFullYear()), make: "", model: "" };
const emptyPart = { name: "", partNumber: "", description: "" };
const emptyService = {
  mileage: "",
  workNeeded: "",
  dvir: "",
  description: "",
  hours: "",
  activityId: "",
  partQty: {} as Record<string, string>,
};

function vehicleLabel(v: VmVehicle) {
  return `#${v.vehicleNumber} · ${v.year} ${v.make} ${v.model}`.trim();
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function VehicleManagerPanel() {
  const toast = useAdminToast();
  const [vehicles, setVehicles] = useState<VmVehicle[]>([]);
  const [parts, setParts] = useState<VmPart[]>([]);
  const [activities, setActivities] = useState<VmActivity[]>([]);
  const [orders, setOrders] = useState<VmServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [vehicleModal, setVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);

  const [partsModal, setPartsModal] = useState(false);
  const [partEditModal, setPartEditModal] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partForm, setPartForm] = useState(emptyPart);
  const [partSearch, setPartSearch] = useState("");

  const [activitiesModal, setActivitiesModal] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

  const [serviceModal, setServiceModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;

  const loadBase = useCallback(async () => {
    setLoading(true);
    const [vRes, pRes, aRes] = await Promise.all([
      adminGet<VmVehicle[]>("/api/admin/vehicle-manager/vehicles"),
      adminGet<VmPart[]>("/api/admin/vehicle-manager/parts"),
      adminGet<VmActivity[]>("/api/admin/vehicle-manager/activities"),
    ]);
    if (vRes.error) toast.error(vRes.error);
    else setVehicles(vRes.data ?? []);
    if (pRes.error) toast.error(pRes.error);
    else setParts(pRes.data ?? []);
    if (aRes.error) toast.error(aRes.error);
    else setActivities(aRes.data ?? []);
    setLoading(false);
  }, [toast]);

  const loadOrders = useCallback(
    async (vehicleId: string) => {
      setLoadingOrders(true);
      const { data, error } = await adminGet<VmServiceOrder[]>(
        `/api/admin/vehicle-manager/service-orders?vehicleId=${encodeURIComponent(vehicleId)}`,
      );
      if (error) toast.error(error);
      else setOrders(data ?? []);
      setLoadingOrders(false);
    },
    [toast],
  );

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (selectedId) loadOrders(selectedId);
  }, [selectedId, loadOrders]);

  const lastWorkByVehicle = useMemo(() => {
    const map = new Map<string, VmServiceOrder>();
    for (const order of orders) {
      if (!map.has(order.vehicleId)) map.set(order.vehicleId, order);
    }
    return map;
  }, [orders]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...vehicles].sort((a, b) => {
      const ga = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      if (ga !== 0) return ga;
      return a.vehicleNumber.localeCompare(b.vehicleNumber, undefined, { numeric: true });
    });
    if (!q) return list;
    return list.filter((v) =>
      `${v.vehicleNumber} ${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  const grouped = useMemo(() => {
    const groups: { key: string; items: VmVehicle[] }[] = [];
    for (const vehicle of filteredVehicles) {
      const key = `${vehicle.make} ${vehicle.model}`.trim() || "Uncategorized";
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(vehicle);
      else groups.push({ key, items: [vehicle] });
    }
    return groups;
  }, [filteredVehicles]);

  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) => `${p.name} ${p.partNumber} ${p.description}`.toLowerCase().includes(q));
  }, [parts, partSearch]);

  async function saveVehicle(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(editingVehicleId ? { id: editingVehicleId } : {}),
      vehicleNumber: vehicleForm.vehicleNumber,
      year: Number(vehicleForm.year),
      make: vehicleForm.make,
      model: vehicleForm.model,
    };
    const { error } = await adminSend("/api/admin/vehicle-manager/vehicles", {
      method: editingVehicleId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (error) toast.error(error);
    else {
      toast.success(editingVehicleId ? "Vehicle updated." : "Vehicle added.");
      setVehicleModal(false);
      setEditingVehicleId(null);
      setVehicleForm(emptyVehicle);
      loadBase();
    }
  }

  async function removeVehicle(id: string) {
    if (!confirm("Delete this vehicle and its service history?")) return;
    const { error } = await adminSend("/api/admin/vehicle-manager/vehicles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      if (selectedId === id) setSelectedId(null);
      toast.success("Vehicle deleted.");
      loadBase();
    }
  }

  async function savePart(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await adminSend("/api/admin/vehicle-manager/parts", {
      method: editingPartId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingPartId ? { id: editingPartId } : {}),
        ...partForm,
      }),
    });
    if (error) toast.error(error);
    else {
      toast.success(editingPartId ? "Part updated." : "Part added.");
      setPartEditModal(false);
      setEditingPartId(null);
      setPartForm(emptyPart);
      loadBase();
    }
  }

  async function removePart(id: string) {
    if (!confirm("Delete this part?")) return;
    const { error } = await adminSend("/api/admin/vehicle-manager/parts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Part deleted.");
      loadBase();
    }
  }

  async function saveActivity(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await adminSend("/api/admin/vehicle-manager/activities", {
      method: editingActivityId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingActivityId ? { id: editingActivityId } : {}),
        name: activityName,
      }),
    });
    if (error) toast.error(error);
    else {
      toast.success(editingActivityId ? "Activity updated." : "Activity added.");
      setEditingActivityId(null);
      setActivityName("");
      loadBase();
    }
  }

  async function removeActivity(id: string) {
    if (!confirm("Delete this activity?")) return;
    const { error } = await adminSend("/api/admin/vehicle-manager/activities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Activity deleted.");
      loadBase();
    }
  }

  function openServiceCreate() {
    setEditingOrderId(null);
    setServiceForm(emptyService);
    setServiceModal(true);
  }

  function openServiceEdit(order: VmServiceOrder) {
    const partQty: Record<string, string> = {};
    for (const line of order.parts) partQty[line.partId] = String(line.quantity);
    setEditingOrderId(order.id);
    setServiceForm({
      mileage: order.mileage,
      workNeeded: order.workNeeded,
      dvir: order.dvir,
      description: order.description,
      hours: String(order.hours || ""),
      activityId: order.activityId ?? "",
      partQty,
    });
    setServiceModal(true);
  }

  async function saveService(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    const selectedParts = Object.entries(serviceForm.partQty)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([partId, quantity]) => ({ partId, quantity: Number(quantity) }));
    const payload = {
      ...(editingOrderId ? { id: editingOrderId } : { vehicleId: selectedId }),
      mileage: serviceForm.mileage,
      workNeeded: serviceForm.workNeeded,
      dvir: serviceForm.dvir,
      description: serviceForm.description,
      hours: Number(serviceForm.hours) || 0,
      activityId: serviceForm.activityId || null,
      parts: selectedParts,
    };
    const { error } = await adminSend("/api/admin/vehicle-manager/service-orders", {
      method: editingOrderId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (error) toast.error(error);
    else {
      toast.success(editingOrderId ? "Service order updated." : "Service order created.");
      setServiceModal(false);
      setEditingOrderId(null);
      setServiceForm(emptyService);
      loadOrders(selectedId);
    }
  }

  async function removeOrder(id: string) {
    if (!confirm("Delete this service order?")) return;
    const { error } = await adminSend("/api/admin/vehicle-manager/service-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else if (selectedId) {
      toast.success("Service order deleted.");
      loadOrders(selectedId);
    }
  }

  // Prefetch last-service snippets for the vehicle grid
  useEffect(() => {
    if (selectedId || !vehicles.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await adminGet<VmServiceOrder[]>("/api/admin/vehicle-manager/service-orders");
      if (!cancelled && data) setOrders(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicles, selectedId]);

  if (selected) {
    const activityName = (id?: string) => activities.find((a) => a.id === id)?.name ?? "—";
    const partName = (id: string) => parts.find((p) => p.id === id)?.name ?? id;

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setSelectedId(null)} className={btnSecondary}>
            <ArrowLeft className="h-4 w-4" /> Back to vehicles
          </button>
          <Can permission="vehicle_manager.create">
            <button type="button" onClick={openServiceCreate} className={btnPrimary}>
              <Plus className="h-4 w-4" /> New work order
            </button>
          </Can>
        </div>

        <article className="mb-6 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-pink-600" />
          <div className="p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Service history</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{vehicleLabel(selected)}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {selected.year} {selected.make} {selected.model}
            </p>
          </div>
        </article>

        {loadingOrders ? (
          <p className="text-slate-500">Loading service history…</p>
        ) : !orders.length ? (
          <EmptyState icon={ClipboardList} title="No service orders yet" text="Log the first work order for this vehicle." />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{order.workNeeded || "Service work"}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Can permission="vehicle_manager.edit">
                      <button type="button" onClick={() => openServiceEdit(order)} className={btnSecondary}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </Can>
                    <Can permission="vehicle_manager.delete">
                      <button type="button" onClick={() => removeOrder(order.id)} className={btnDanger}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Can>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Mileage</dt>
                    <dd className="text-slate-300">{order.mileage || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Hours</dt>
                    <dd className="text-slate-300">{order.hours || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Activity</dt>
                    <dd className="text-slate-300">{activityName(order.activityId)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">DVIR</dt>
                    <dd className="text-slate-300">{order.dvir || "—"}</dd>
                  </div>
                </dl>
                {order.description ? <p className="mt-3 text-sm text-slate-400">{order.description}</p> : null}
                {order.parts.length ? (
                  <div className="mt-3 space-y-1.5">
                    {order.parts.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-300"
                      >
                        {partName(line.partId)} × {line.quantity}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <AdminModal open={serviceModal} onClose={() => setServiceModal(false)} title={editingOrderId ? "Edit work order" : "New work order"} wide>
          <form onSubmit={saveService} className="space-y-3">
            <input
              className={inputClass}
              placeholder="Mileage"
              value={serviceForm.mileage}
              onChange={(e) => setServiceForm({ ...serviceForm, mileage: e.target.value })}
            />
            <select
              className={inputClass}
              value={serviceForm.activityId}
              onChange={(e) => setServiceForm({ ...serviceForm, activityId: e.target.value })}
            >
              <option value="">Activity (optional)</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Work needed"
              value={serviceForm.workNeeded}
              onChange={(e) => setServiceForm({ ...serviceForm, workNeeded: e.target.value })}
              required
            />
            <input
              className={inputClass}
              placeholder="DVIR"
              value={serviceForm.dvir}
              onChange={(e) => setServiceForm({ ...serviceForm, dvir: e.target.value })}
            />
            <textarea
              className={`${inputClass} min-h-[5rem]`}
              placeholder="Description"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
            />
            <input
              className={inputClass}
              type="number"
              step="0.1"
              min="0"
              placeholder="Hours"
              value={serviceForm.hours}
              onChange={(e) => setServiceForm({ ...serviceForm, hours: e.target.value })}
            />
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Parts</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                {parts.length ? (
                  parts.map((part) => (
                    <label key={part.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                      <span className="min-w-0 truncate">
                        {part.name}
                        {part.partNumber ? <span className="text-slate-500"> · {part.partNumber}</span> : null}
                      </span>
                      <input
                        className={`${inputClass} w-20`}
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={serviceForm.partQty[part.id] ?? ""}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            partQty: { ...serviceForm.partQty, [part.id]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No parts in catalog yet. Add parts from the Vehicles screen.</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary}>
                {editingOrderId ? "Save changes" : "Create work order"}
              </button>
              <button type="button" onClick={() => setServiceModal(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Vehicle Manager"
        subtitle="Track shop PM vehicles, service history, parts, and activities."
        actions={
          <>
            <Can permission="vehicle_manager.create">
              <button
                type="button"
                onClick={() => {
                  setEditingVehicleId(null);
                  setVehicleForm(emptyVehicle);
                  setVehicleModal(true);
                }}
                className={btnPrimary}
              >
                <Plus className="h-4 w-4" /> Add vehicle
              </button>
            </Can>
            <Can permission="vehicle_manager.view">
              <button type="button" onClick={() => setActivitiesModal(true)} className={btnSecondary}>
                <ClipboardList className="h-4 w-4" /> Activities
              </button>
              <button type="button" onClick={() => setPartsModal(true)} className={btnSecondary}>
                <Package className="h-4 w-4" /> Parts
              </button>
            </Can>
          </>
        }
      />

      <div className="mb-6">
        <input
          className={`${inputClass} max-w-xl`}
          placeholder="Search by number, make, or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading vehicles…</p>
      ) : !filteredVehicles.length ? (
        <EmptyState icon={Wrench} title="No vehicles yet" text="Add your first vehicle to start logging service." />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.key}>
              <h3 className="mb-3 border-b border-slate-800/80 pb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                {group.key}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((vehicle) => {
                  const last = lastWorkByVehicle.get(vehicle.id);
                  return (
                    <article
                      key={vehicle.id}
                      className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 transition hover:border-slate-700"
                    >
                      <div className="h-1 bg-gradient-to-r from-amber-500 to-pink-600" />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-lg font-semibold text-white">#{vehicle.vehicleNumber}</p>
                            <p className="text-sm text-slate-400">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Can permission="vehicle_manager.edit">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                aria-label="Edit vehicle"
                                onClick={() => {
                                  setEditingVehicleId(vehicle.id);
                                  setVehicleForm({
                                    vehicleNumber: vehicle.vehicleNumber,
                                    year: String(vehicle.year),
                                    make: vehicle.make,
                                    model: vehicle.model,
                                  });
                                  setVehicleModal(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </Can>
                            <Can permission="vehicle_manager.delete">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                                aria-label="Delete vehicle"
                                onClick={() => removeVehicle(vehicle.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Can>
                          </div>
                        </div>
                        <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                          {last ? (
                            <>
                              <span className="font-medium text-slate-300">Last work:</span> {last.workNeeded || "Service"}{" "}
                              · {formatDate(last.createdAt)}
                            </>
                          ) : (
                            "No service history yet"
                          )}
                        </div>
                        <button type="button" onClick={() => setSelectedId(vehicle.id)} className={`${btnSecondary} mt-4 w-full`}>
                          <Wrench className="h-4 w-4" /> Service
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AdminModal
        open={vehicleModal}
        onClose={() => setVehicleModal(false)}
        title={editingVehicleId ? "Edit vehicle" : "Add vehicle"}
      >
        <form onSubmit={saveVehicle} className="space-y-3">
          <input
            className={inputClass}
            placeholder="Vehicle number"
            value={vehicleForm.vehicleNumber}
            onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
            required
          />
          <select
            className={inputClass}
            value={vehicleForm.year}
            onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="Make"
            value={vehicleForm.make}
            onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Model"
            value={vehicleForm.model}
            onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              {editingVehicleId ? "Save changes" : "Add vehicle"}
            </button>
            <button type="button" onClick={() => setVehicleModal(false)} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={partsModal} onClose={() => setPartsModal(false)} title="Parts catalog" wide>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              className={`${inputClass} min-w-[12rem] flex-1`}
              placeholder="Search parts…"
              value={partSearch}
              onChange={(e) => setPartSearch(e.target.value)}
            />
            <Can permission="vehicle_manager.create">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setEditingPartId(null);
                  setPartForm(emptyPart);
                  setPartEditModal(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add part
              </button>
            </Can>
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {filteredParts.length ? (
              filteredParts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{part.name}</p>
                    <p className="text-xs text-slate-500">
                      {part.partNumber || "No part #"}
                      {part.description ? ` · ${part.description}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Can permission="vehicle_manager.edit">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => {
                          setEditingPartId(part.id);
                          setPartForm({
                            name: part.name,
                            partNumber: part.partNumber,
                            description: part.description,
                          });
                          setPartEditModal(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </Can>
                    <Can permission="vehicle_manager.delete">
                      <button type="button" className={btnDanger} onClick={() => removePart(part.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Can>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No parts yet.</p>
            )}
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={partEditModal}
        onClose={() => setPartEditModal(false)}
        title={editingPartId ? "Edit part" : "Add part"}
      >
        <form onSubmit={savePart} className="space-y-3">
          <input
            className={inputClass}
            placeholder="Part name"
            value={partForm.name}
            onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Part number"
            value={partForm.partNumber}
            onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })}
          />
          <textarea
            className={`${inputClass} min-h-[4rem]`}
            placeholder="Description"
            value={partForm.description}
            onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              {editingPartId ? "Save changes" : "Add part"}
            </button>
            <button type="button" onClick={() => setPartEditModal(false)} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={activitiesModal} onClose={() => setActivitiesModal(false)} title="Activities">
        <form onSubmit={saveActivity} className="mb-4 flex flex-wrap gap-2">
          <input
            className={`${inputClass} min-w-[12rem] flex-1`}
            placeholder="Activity name"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            required
          />
          <Can permission={editingActivityId ? "vehicle_manager.edit" : "vehicle_manager.create"}>
            <button type="submit" className={btnPrimary}>
              {editingActivityId ? "Save" : "Add"}
            </button>
          </Can>
          {editingActivityId ? (
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setEditingActivityId(null);
                setActivityName("");
              }}
            >
              Cancel
            </button>
          ) : null}
        </form>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
            >
              <p className="text-sm text-slate-200">{activity.name}</p>
              <div className="flex gap-1">
                <Can permission="vehicle_manager.edit">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setEditingActivityId(activity.id);
                      setActivityName(activity.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </Can>
                <Can permission="vehicle_manager.delete">
                  <button type="button" className={btnDanger} onClick={() => removeActivity(activity.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Can>
              </div>
            </div>
          ))}
        </div>
      </AdminModal>
    </div>
  );
}
