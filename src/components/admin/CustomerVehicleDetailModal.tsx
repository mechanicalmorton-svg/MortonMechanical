"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  normalizePlate,
  normalizeVin,
  plateValidationError,
  vinValidationError,
} from "@/lib/customer-vehicles";
import type { CustomerVehicle, VehicleServiceHistoryEntry } from "@/lib/shop-types";
import { VEHICLE_SERVICE_CATEGORIES } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { VehicleGlovebox } from "./VehicleGlovebox";
import { btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

type Props = {
  open: boolean;
  customerVehicleId: string | null;
  onClose: () => void;
  onUpdated?: (vehicle: CustomerVehicle) => void;
  stacked?: boolean;
};

const emptyHistoryForm = {
  performedOn: new Date().toISOString().slice(0, 10),
  mileage: "",
  category: "Service",
  summary: "",
  description: "",
};

export function CustomerVehicleDetailModal({
  open,
  customerVehicleId,
  onClose,
  onUpdated,
  stacked,
}: Props) {
  const toast = useAdminToast();
  const [vehicle, setVehicle] = useState<CustomerVehicle | null>(null);
  const [history, setHistory] = useState<VehicleServiceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vin, setVin] = useState("");
  const [plate, setPlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [historyForm, setHistoryForm] = useState(emptyHistoryForm);
  const [savingHistory, setSavingHistory] = useState(false);

  async function load() {
    if (!customerVehicleId) return;
    setLoading(true);
    const [vehiclesRes, historyRes] = await Promise.all([
      adminGet<CustomerVehicle[]>("/api/admin/customers/vehicles"),
      adminGet<VehicleServiceHistoryEntry[]>(
        `/api/admin/customers/vehicles/history?customerVehicleId=${encodeURIComponent(customerVehicleId)}`,
      ),
    ]);
    if (vehiclesRes.error) toast.error(vehiclesRes.error);
    const found = (vehiclesRes.data ?? []).find((item) => item.id === customerVehicleId) ?? null;
    setVehicle(found);
    setVin(found?.vin ?? "");
    setPlate(found?.plate ?? "");
    setMileage(found?.mileage != null ? String(found.mileage) : "");
    setNotes(found?.notes ?? "");
    if (historyRes.error) toast.error(historyRes.error);
    else setHistory(historyRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (open && customerVehicleId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerVehicleId]);

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicle) return;
    const nextVin = normalizeVin(vin);
    const nextPlate = normalizePlate(plate);
    const vinError = nextVin ? vinValidationError(nextVin) : null;
    if (vinError) {
      toast.error(vinError);
      return;
    }
    const plateError = nextPlate ? plateValidationError(nextPlate) : null;
    if (plateError) {
      toast.error(plateError);
      return;
    }

    setSaving(true);
    const { data, error } = await adminSend<CustomerVehicle>("/api/admin/customers/vehicles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: vehicle.id,
        vin: nextVin,
        plate: nextPlate,
        mileage: mileage.trim() ? Number(mileage) : null,
        notes: notes.trim(),
      }),
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Vehicle updated.");
    setVehicle(data);
    if (data) onUpdated?.(data);
  }

  async function addHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!customerVehicleId) return;
    if (!historyForm.summary.trim()) {
      toast.error("Summary is required.");
      return;
    }
    setSavingHistory(true);
    const { error } = await adminSend("/api/admin/customers/vehicles/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerVehicleId,
        performedOn: historyForm.performedOn,
        mileage: historyForm.mileage.trim() ? Number(historyForm.mileage) : undefined,
        category: historyForm.category,
        summary: historyForm.summary.trim(),
        description: historyForm.description.trim() || undefined,
      }),
    });
    setSavingHistory(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Service history added.");
    setHistoryForm({ ...emptyHistoryForm, performedOn: new Date().toISOString().slice(0, 10) });
    void load();
  }

  async function removeHistory(id: string) {
    if (!confirm("Remove this service history entry?")) return;
    const { error } = await adminSend("/api/admin/customers/vehicles/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Entry removed.");
      void load();
    }
  }

  const title = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle details"
    : "Vehicle details";

  return (
    <AdminModal open={open} onClose={onClose} title={title} wide stacked={stacked}>
      {loading || !vehicle ? (
        <p className="text-sm text-slate-500">{loading ? "Loading vehicle…" : "Vehicle not found."}</p>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            Customer vehicle file — glovebox docs and maintenance history for jobs and bookings.
          </p>

          <form onSubmit={saveIdentity} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Identity</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  VIN
                </span>
                <input
                  className={inputClass}
                  value={vin}
                  maxLength={17}
                  placeholder="17 characters"
                  onChange={(e) => setVin(normalizeVin(e.target.value).slice(0, 17))}
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  License Plate
                </span>
                <input
                  className={inputClass}
                  value={plate}
                  placeholder="e.g. ABC1234"
                  onChange={(e) => setPlate(normalizePlate(e.target.value))}
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Mileage
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </label>
              <label className="block text-sm text-slate-300 sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Notes
                </span>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
            <Can permission="customers.edit">
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save vehicle"}
              </button>
            </Can>
          </form>

          <VehicleGlovebox customerVehicleId={vehicle.id} />

          <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <p className="text-sm font-medium text-white">Maintenance timeline</p>
              <p className="text-xs text-slate-500">Service history for this customer vehicle.</p>
            </div>

            <Can permission="customers.edit">
              <form onSubmit={addHistory} className="grid gap-2 sm:grid-cols-2">
                <input
                  className={inputClass}
                  type="date"
                  value={historyForm.performedOn}
                  onChange={(e) => setHistoryForm({ ...historyForm, performedOn: e.target.value })}
                  required
                />
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  placeholder="Mileage"
                  value={historyForm.mileage}
                  onChange={(e) => setHistoryForm({ ...historyForm, mileage: e.target.value })}
                />
                <select
                  className={inputClass}
                  value={historyForm.category}
                  onChange={(e) => setHistoryForm({ ...historyForm, category: e.target.value })}
                >
                  {VEHICLE_SERVICE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  className={inputClass}
                  placeholder="Summary"
                  value={historyForm.summary}
                  onChange={(e) => setHistoryForm({ ...historyForm, summary: e.target.value })}
                  required
                />
                <textarea
                  className={`${inputClass} sm:col-span-2`}
                  rows={2}
                  placeholder="Notes (optional)"
                  value={historyForm.description}
                  onChange={(e) => setHistoryForm({ ...historyForm, description: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <button type="submit" className={btnPrimary} disabled={savingHistory}>
                    <Plus className="h-3.5 w-3.5" />
                    {savingHistory ? "Saving…" : "Add history"}
                  </button>
                </div>
              </form>
            </Can>

            {!history.length ? (
              <p className="text-xs text-slate-500">No service history yet.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {entry.summary}
                        <span className="ml-2 text-[11px] font-normal text-slate-500">{entry.category}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.performedOn}
                        {entry.mileage != null ? ` · ${entry.mileage.toLocaleString()} mi` : ""}
                      </p>
                      {entry.description ? <p className="mt-1 text-xs text-slate-400">{entry.description}</p> : null}
                    </div>
                    <Can permission="customers.edit">
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => removeHistory(entry.id)}
                        aria-label="Remove history entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Can>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex justify-end">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </AdminModal>
  );
}
