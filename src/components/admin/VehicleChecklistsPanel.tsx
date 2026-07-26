"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import type { VmChecklist, VmVehicle } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

function progressTone(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  if (pct > 0) return "bg-rose-500";
  return "bg-slate-600";
}

export function VehicleChecklistsPanel() {
  const toast = useAdminToast();
  const [checklists, setChecklists] = useState<VmChecklist[]>([]);
  const [vehicles, setVehicles] = useState<VmVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [addVehicleFor, setAddVehicleFor] = useState<string | null>(null);
  const [addVehicleId, setAddVehicleId] = useState("");

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, vRes] = await Promise.all([
      adminGet<VmChecklist[]>("/api/admin/vehicle-manager/checklists"),
      adminGet<VmVehicle[]>("/api/admin/vehicle-manager/vehicles"),
    ]);
    if (cRes.error) toast.error(cRes.error);
    else setChecklists(cRes.data ?? []);
    if (vRes.error) toast.error(vRes.error);
    else setVehicles(vRes.data ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleCreateVehicle(id: string) {
    setSelectedVehicleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function createChecklist(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await adminSend("/api/admin/vehicle-manager/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        vehicleIds: selectedVehicleIds,
      }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Checklist created.");
      setCreateOpen(false);
      setName("");
      setSelectedVehicleIds([]);
      load();
    }
  }

  async function toggleItem(checklistId: string, itemId: string) {
    const { error } = await adminSend("/api/admin/vehicle-manager/checklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: checklistId, toggleItemId: itemId }),
    });
    if (error) toast.error(error);
    else load();
  }

  async function removeItem(checklist: VmChecklist, itemId: string) {
    const items = checklist.items.filter((item) => item.id !== itemId);
    const { error } = await adminSend("/api/admin/vehicle-manager/checklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: checklist.id, items }),
    });
    if (error) toast.error(error);
    else load();
  }

  async function addVehicle(checklist: VmChecklist) {
    if (!addVehicleId) return;
    if (checklist.items.some((item) => item.vehicleId === addVehicleId)) {
      toast.error("Vehicle is already on this checklist.");
      return;
    }
    const items = [
      ...checklist.items,
      {
        vehicleId: addVehicleId,
        sortOrder: checklist.items.length,
        isDone: false,
      },
    ];
    const { error } = await adminSend("/api/admin/vehicle-manager/checklists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: checklist.id, items }),
    });
    if (error) toast.error(error);
    else {
      setAddVehicleFor(null);
      setAddVehicleId("");
      load();
    }
  }

  async function removeChecklist(id: string) {
    if (!confirm("Delete this checklist?")) return;
    const { error } = await adminSend("/api/admin/vehicle-manager/checklists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Checklist deleted.");
      load();
    }
  }

  function vehicleLabel(id: string) {
    const v = vehicleMap.get(id);
    if (!v) return "Unknown vehicle";
    return `#${v.vehicleNumber} · ${v.year} ${v.make} ${v.model}`;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Checklists"
        subtitle="Track completion across Vehicle Manager units."
        actions={
          <Can permission="vehicle_manager.create">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setName("");
                setSelectedVehicleIds([]);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New checklist
            </button>
          </Can>
        }
      />

      {loading ? (
        <p className="text-slate-500">Loading checklists…</p>
      ) : !checklists.length ? (
        <EmptyState icon={CheckSquare} title="No checklists yet" text="Create a checklist and pick vehicles to complete." />
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const total = checklist.items.length;
            const done = checklist.items.filter((item) => item.isDone).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const availableToAdd = vehicles.filter((v) => !checklist.items.some((item) => item.vehicleId === v.id));

            return (
              <article key={checklist.id} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800/70 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{checklist.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {done}/{total} complete · {pct}%
                    </p>
                  </div>
                  <Can permission="vehicle_manager.delete">
                    <button type="button" className={btnDanger} onClick={() => removeChecklist(checklist.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Can>
                </div>

                <div className="px-5 py-3">
                  <div className="relative h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressTone(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
                      {pct}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 px-5 pb-4">
                  {checklist.items.length ? (
                    checklist.items
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
                        >
                          <p
                            className={`text-left text-sm ${
                              item.isDone ? "text-slate-500 line-through" : "text-slate-200"
                            }`}
                          >
                            {vehicleLabel(item.vehicleId)}
                          </p>
                          <div className="flex gap-2">
                            <Can permission="vehicle_manager.edit">
                              <button
                                type="button"
                                className={btnSecondary}
                                onClick={() => toggleItem(checklist.id, item.id)}
                              >
                                {item.isDone ? "Undo" : "Done"}
                              </button>
                            </Can>
                            <Can permission="vehicle_manager.edit">
                              <button
                                type="button"
                                className={btnDanger}
                                onClick={() => removeItem(checklist, item.id)}
                              >
                                Remove
                              </button>
                            </Can>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-slate-500">No vehicles on this checklist.</p>
                  )}

                  <Can permission="vehicle_manager.edit">
                    {addVehicleFor === checklist.id ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <select
                          className={`${inputClass} min-w-[14rem] flex-1`}
                          value={addVehicleId}
                          onChange={(e) => setAddVehicleId(e.target.value)}
                        >
                          <option value="">Select vehicle…</option>
                          {availableToAdd.map((v) => (
                            <option key={v.id} value={v.id}>
                              #{v.vehicleNumber} · {v.year} {v.make} {v.model}
                            </option>
                          ))}
                        </select>
                        <button type="button" className={btnPrimary} onClick={() => addVehicle(checklist)}>
                          Add
                        </button>
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => {
                            setAddVehicleFor(null);
                            setAddVehicleId("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`${btnSecondary} mt-1`}
                        onClick={() => {
                          setAddVehicleFor(checklist.id);
                          setAddVehicleId("");
                        }}
                        disabled={!availableToAdd.length}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add vehicle
                      </button>
                    )}
                  </Can>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AdminModal open={createOpen} onClose={() => setCreateOpen(false)} title="New checklist" wide>
        <form onSubmit={createChecklist} className="space-y-4">
          <input
            className={inputClass}
            placeholder="Checklist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vehicles</p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
              {vehicles.length ? (
                vehicles.map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-slate-900/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVehicleIds.includes(vehicle.id)}
                      onChange={() => toggleCreateVehicle(vehicle.id)}
                      className="accent-amber-500"
                    />
                    <span>
                      #{vehicle.vehicleNumber} · {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                  </label>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">
                  Add vehicles in Vehicle Manager first.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary}>
              Create checklist
            </button>
            <button type="button" onClick={() => setCreateOpen(false)} className={btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
