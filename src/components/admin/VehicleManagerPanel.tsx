"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import type { VmActivity, VmPart, VmServiceOrder, VmVehicle, VmVehicleStatus } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can, usePermissions } from "./permissions";

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
  return v.name || `#${v.vehicleNumber}`;
}

function vehicleMeta(v: VmVehicle) {
  const number = v.vehicleNumber ? `#${v.vehicleNumber}` : "";
  const makeModel = [v.make, v.model].filter(Boolean).join(" ");
  return [number, makeModel].filter(Boolean).join(" · ");
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
  const { hasPermission, isFounder } = usePermissions();
  const canReturnService = isFounder || hasPermission("vehicle_manager.return_service");
  const [vehicles, setVehicles] = useState<VmVehicle[]>([]);
  const [parts, setParts] = useState<VmPart[]>([]);
  const [activities, setActivities] = useState<VmActivity[]>([]);
  const [orders, setOrders] = useState<VmServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    const [vRes, pRes, aRes, oRes] = await Promise.all([
      adminGet<VmVehicle[]>("/api/admin/vehicle-manager/vehicles"),
      adminGet<VmPart[]>("/api/admin/vehicle-manager/parts"),
      adminGet<VmActivity[]>("/api/admin/vehicle-manager/activities"),
      adminGet<VmServiceOrder[]>("/api/admin/vehicle-manager/service-orders"),
    ]);
    if (vRes.error) toast.error(vRes.error);
    else setVehicles(vRes.data ?? []);
    if (pRes.error) toast.error(pRes.error);
    else setParts(pRes.data ?? []);
    if (aRes.error) toast.error(aRes.error);
    else setActivities(aRes.data ?? []);
    if (oRes.error) toast.error(oRes.error);
    else setOrders(oRes.data ?? []);
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
    if (selectedId) {
      loadOrders(selectedId);
      return;
    }
    // Returning to the grid — refresh all orders for last-activity / logged-by cards.
    let cancelled = false;
    (async () => {
      const { data, error } = await adminGet<VmServiceOrder[]>(
        "/api/admin/vehicle-manager/service-orders",
      );
      if (cancelled) return;
      if (error) toast.error(error);
      else setOrders(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadOrders, toast]);

  const lastWorkByVehicle = useMemo(() => {
    const map = new Map<string, VmServiceOrder>();
    for (const order of orders) {
      const prev = map.get(order.vehicleId);
      if (!prev || new Date(order.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
        map.set(order.vehicleId, order);
      }
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
      `${v.name} ${v.vehicleNumber} ${v.year} ${v.make} ${v.model} ${v.status}`.toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  async function updateStatus(id: string, status: VmVehicleStatus) {
    const { error } = await adminSend("/api/admin/vehicle-manager/vehicles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (error) toast.error(error);
    else loadBase();
  }

  function toggleCardStatus(vehicle: VmVehicle) {
    if (vehicle.status === "out_of_service") {
      if (!canReturnService) {
        toast.error("Only authorized roles can return a vehicle to service.");
        return;
      }
      void updateStatus(vehicle.id, "active");
      return;
    }
    const next: VmVehicleStatus = vehicle.status === "maintenance" ? "active" : "maintenance";
    void updateStatus(vehicle.id, next);
  }

  function toggleOutOfService(vehicle: VmVehicle) {
    if (vehicle.status === "out_of_service") {
      if (!canReturnService) {
        toast.error("Only authorized roles can return a vehicle to service.");
        return;
      }
      void updateStatus(vehicle.id, "active");
      return;
    }
    void updateStatus(vehicle.id, "out_of_service");
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
    setServiceForm({
      ...emptyService,
      mileage: selected?.mileage != null ? String(selected.mileage) : "",
    });
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
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{vehicleLabel(selected)}</p>
                <p className="text-sm text-slate-400">{vehicleMeta(selected)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {[selected.year, selected.make, selected.model].filter(Boolean).join(" ")}
                </p>
              </div>
              <StatusBadge status={selected.status || "active"} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Mileage</dt>
                <dd className="text-slate-300">{selected.mileage?.toLocaleString() ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Last service</dt>
                <dd className="text-slate-300">
                  {selected.lastService ? new Date(selected.lastService).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
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
                    <dt className="text-xs text-slate-500">Logged by</dt>
                    <dd className="text-slate-300">{order.createdBy || "—"}</dd>
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
                  <p className="text-xs text-slate-500">No parts available for this work order.</p>
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
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Vehicle Manager"
          subtitle="Track shop PM vehicles, service history, and activities."
        />
        <Can permission="vehicle_manager.view">
          <button type="button" onClick={() => setActivitiesModal(true)} className={btnSecondary}>
            <ClipboardList className="h-4 w-4" /> Activities
          </button>
        </Can>
      </div>

      <div className="mb-6">
        <input
          className={`${inputClass} max-w-xl`}
          placeholder="Search by name, number, make, or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !filteredVehicles.length ? (
        <EmptyState icon={Wrench} title="No vehicles yet" text="Add your first vehicle to start logging service." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVehicles.map((vehicle) => {
            const last = lastWorkByVehicle.get(vehicle.id);
            const lastServiceDisplay = vehicle.lastService
              ? new Date(vehicle.lastService).toLocaleDateString()
              : last
                ? new Date(last.createdAt).toLocaleDateString()
                : "—";
            const lastActivityDisplay =
              (last?.activityId
                ? activities.find((a) => a.id === last.activityId)?.name
                : undefined) ||
              last?.workNeeded?.trim() ||
              "—";
            const lastLoggedBy = last?.createdBy?.trim() || "—";
            const statusLabel =
              vehicle.status === "maintenance"
                ? "Maintenance"
                : vehicle.status === "out_of_service"
                  ? "Out of service"
                  : "Active";
            return (
              <article key={vehicle.id} className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="h-0.5 bg-gradient-to-r from-amber-500 to-pink-600" />
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{vehicleLabel(vehicle)}</p>
                      <p className="truncate text-xs text-slate-400">{vehicleMeta(vehicle)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                      </p>
                    </div>
                    <StatusBadge status={vehicle.status || "active"} />
                  </div>
                  <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-500">Mileage</dt>
                      <dd className="text-slate-300">{vehicle.mileage?.toLocaleString() ?? "—"}</dd>
                      <dt className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Last activity</dt>
                      <dd className="truncate text-slate-300" title={lastActivityDisplay}>
                        {lastActivityDisplay}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-500">Last service</dt>
                      <dd className="text-slate-300">{lastServiceDisplay}</dd>
                      <dt className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Logged by</dt>
                      <dd className="truncate text-slate-300" title={lastLoggedBy}>
                        {lastLoggedBy}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Can permission="vehicle_manager.edit">
                      <button
                        type="button"
                        onClick={() => toggleCardStatus(vehicle)}
                        disabled={vehicle.status === "out_of_service" && !canReturnService}
                        className={`inline-flex h-7 flex-1 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                          vehicle.status === "out_of_service"
                            ? "border-slate-700/70 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            : vehicle.status === "maintenance"
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/20"
                              : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20"
                        }`}
                        aria-label={
                          vehicle.status === "out_of_service"
                            ? canReturnService
                              ? "Return vehicle to Active"
                              : "Out of service — only authorized roles can return this vehicle"
                            : `Status ${statusLabel}. Click to switch Active and Maintenance.`
                        }
                      >
                        {vehicle.status === "maintenance" ? "Maintenance" : "Active"}
                      </button>
                    </Can>
                    <button
                      type="button"
                      onClick={() => setSelectedId(vehicle.id)}
                      className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-700/70 bg-slate-900/50 px-2.5 text-[11px] font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/70 hover:text-white active:scale-[0.98]"
                    >
                      <Wrench className="h-3 w-3" /> Service
                    </button>
                    {vehicle.status === "out_of_service" ? (
                      <Can
                        permission="vehicle_manager.return_service"
                        fallback={
                          <button
                            type="button"
                            disabled
                            className="inline-flex h-7 flex-1 cursor-not-allowed items-center justify-center rounded-lg border border-red-500/45 bg-red-500/20 px-2 text-[11px] font-semibold text-red-100 opacity-80"
                            aria-label="Out of service — only authorized roles can return this vehicle"
                            title="Only authorized roles can return this vehicle to service"
                          >
                            Out of service
                          </button>
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleOutOfService(vehicle)}
                          className="inline-flex h-7 flex-1 items-center justify-center rounded-lg border border-red-500/45 bg-red-500/20 px-2 text-[11px] font-semibold text-red-100 transition hover:bg-red-500/25 active:scale-[0.98]"
                          aria-label="Return vehicle to service"
                          title="Click to return to Active"
                        >
                          Out of service
                        </button>
                      </Can>
                    ) : (
                      <Can permission="vehicle_manager.edit">
                        <button
                          type="button"
                          onClick={() => toggleOutOfService(vehicle)}
                          className="inline-flex h-7 flex-1 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 px-2 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/15 hover:text-red-100 active:scale-[0.98]"
                          aria-label="Mark out of service"
                        >
                          Out of service
                        </button>
                      </Can>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

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
