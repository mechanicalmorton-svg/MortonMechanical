"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Barcode, Minus, Package, Pencil, Plus, Trash2 } from "lucide-react";
import type { FleetVehicle, InventoryItem } from "@/lib/shop-types";
import {
  formatFleetVehicleOption,
  resolveInventoryVehicle,
  sortFleetForSelect,
  vehicleLocationLabel,
} from "@/lib/inventory-fleet";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { EmptyState, ErrorBanner, PageHeader, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { SearchableSelect } from "./SearchableSelect";

type Props = { lowStockOnly?: boolean };

const CATEGORIES = [
  "General",
  "Filters",
  "Fluids",
  "Brakes",
  "Electrical",
  "Engine",
  "Belts",
  "Batteries",
  "Tires",
  "Tools",
  "Other",
] as const;

const emptyForm = {
  name: "",
  partNumber: "",
  sku: "",
  category: "General",
  quantity: "0",
  minStock: "1",
  unitCost: "0",
  supplier: "",
  vehicleId: "",
};

function categoryOptions(current?: string) {
  const set = new Set<string>(CATEGORIES);
  if (current?.trim()) set.add(current.trim());
  return [...set].sort((a, b) => {
    const ai = CATEGORIES.indexOf(a as (typeof CATEGORIES)[number]);
    const bi = CATEGORIES.indexOf(b as (typeof CATEGORIES)[number]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

function groupByCategory(items: InventoryItem[]) {
  const map = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const category = item.category?.trim() || "Uncategorized";
    const list = map.get(category) ?? [];
    list.push(item);
    map.set(category, list);
  }

  const groups: { category: string; items: InventoryItem[] }[] = [];
  for (const category of CATEGORIES) {
    const list = map.get(category);
    if (list?.length) {
      groups.push({ category, items: list.sort((a, b) => a.name.localeCompare(b.name)) });
      map.delete(category);
    }
  }

  for (const [category, list] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    groups.push({ category, items: list.sort((a, b) => a.name.localeCompare(b.name)) });
  }

  return groups;
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function FormField({
  label,
  htmlFor,
  hint,
  required,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm text-slate-300 ${className}`}>
      <span className="font-medium text-slate-200">
        {label}
        {required ? <span className="text-amber-400"> *</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}

export function InventoryPanel({ lowStockOnly }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [closeDropdowns, setCloseDropdowns] = useState(0);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");

  async function load() {
    setLoading(true);
    setError("");
    const [inventoryRes, fleetRes] = await Promise.all([
      adminGet<InventoryItem[]>("/api/admin/inventory"),
      adminGet<FleetVehicle[]>("/api/admin/fleet"),
    ]);
    if (inventoryRes.error) setError(inventoryRes.error);
    else setItems(inventoryRes.data ?? []);
    if (fleetRes.error) setError((prev) => prev || fleetRes.error || "");
    else setFleet(fleetRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scanMode) scanInputRef.current?.focus();
  }, [scanMode]);

  const closeAllDropdowns = useCallback(() => {
    setCloseDropdowns((n) => n + 1);
  }, []);

  const handleScan = useCallback(
    async (rawSku: string) => {
      const sku = rawSku.trim();
      if (!sku) return;
      closeAllDropdowns();
      setScanMessage("");
      setError("");

      const { data: item, error: lookupError } = await adminGet<InventoryItem | null>(
        `/api/admin/inventory?sku=${encodeURIComponent(sku)}`,
      );
      if (lookupError) {
        setError(lookupError);
        return;
      }

      if (item) {
        const { data: updated, error: adjustError } = await adminSend<InventoryItem>("/api/admin/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, adjust: 1 }),
        });
        if (adjustError) {
          setError(adjustError);
          return;
        }

        const nextItem = updated ?? { ...item, quantity: item.quantity + 1 };
        setItems((prev) => prev.map((row) => (row.id === nextItem.id ? nextItem : row)));
        setScanMessage(`+1 ${nextItem.name} (${sku}) — stock now ${nextItem.quantity}`);
        return;
      }

      if (showForm && !editingId) {
        setForm((prev) => ({ ...prev, sku }));
        setScanMessage(`Barcode ${sku} added to the form — complete details and click Save part.`);
        return;
      }

      setScanMessage(`SKU "${sku}" not found. Click Add Part to create a new inventory item.`);
    },
    [closeAllDropdowns, showForm, editingId],
  );

  useEffect(() => {
    if (!scanMode) return;

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;
      if (target !== scanInputRef.current && (target.tagName === "INPUT" || target.tagName === "SELECT")) return;

      if (e.key === "Enter") {
        const code = scanBufferRef.current.trim();
        if (code) {
          e.preventDefault();
          handleScan(code);
          scanBufferRef.current = "";
          if (scanInputRef.current) scanInputRef.current.value = "";
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scanMode, handleScan]);

  const filtered = lowStockOnly ? items.filter((item) => item.quantity <= item.minStock) : items;
  const grouped = groupByCategory(filtered);
  const fleetOptions = sortFleetForSelect(fleet);

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    const location = form.vehicleId ? vehicleLocationLabel(form.vehicleId, fleet) : "";
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      ...form,
      vehicleId: form.vehicleId,
      location,
      quantity: Number(form.quantity),
      minStock: Number(form.minStock),
      unitCost: Number(form.unitCost),
    };
    const { error: message } = await adminSend("/api/admin/inventory", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (message) setError(message);
    else {
      closeModal();
      load();
    }
  }

  function closeModal() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      partNumber: item.partNumber ?? "",
      sku: item.sku,
      category: item.category?.trim() || "General",
      quantity: String(item.quantity),
      minStock: String(item.minStock),
      unitCost: String(item.unitCost),
      supplier: item.supplier ?? "",
      vehicleId: item.vehicleId ?? "",
    });
    setShowForm(true);
  }

  async function adjustStock(item: InventoryItem, delta: number) {
    const { error: message } = await adminSend("/api/admin/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, quantity: Math.max(0, item.quantity + delta) }),
    });
    if (message) setError(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this inventory item?")) return;
    const { error: message } = await adminSend("/api/admin/inventory", {
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
        <PageHeader
          title={lowStockOnly ? "Low Stock Alerts" : "Inventory"}
          subtitle={lowStockOnly ? "Parts at or below minimum stock levels." : "Manage parts, fluids, and shop supplies."}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setScanMode((v) => !v);
              setScanMessage("");
            }}
            className={scanMode ? `${btnPrimary} ring-2 ring-emerald-400/40` : btnSecondary}
          >
            <Barcode className="h-4 w-4" />
            {scanMode ? "Scan mode on" : "Barcode scan"}
          </button>
          <button type="button" onClick={openAddModal} className={btnPrimary}>
            <Plus className="h-4 w-4" /> {lowStockOnly ? "Add Part" : "Add Inventory"}
          </button>
        </div>
      </div>

      {scanMode && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-200">Barcode scan mode active</p>
          <p className="mt-1 text-xs text-emerald-100/80">
            Scan a known barcode to add 1 to stock instantly. Unknown barcodes fill the Add Part form if it&apos;s open — they never auto-save or close your form.
          </p>
          <label className="mt-3 block text-xs font-medium text-emerald-100/90">
            Scan or type barcode
            <input
              ref={scanInputRef}
              className={`${inputClass} mt-1.5 font-mono`}
              placeholder="Point scanner here or type SKU and press Enter"
              aria-label="Barcode scanner input"
              onChange={(e) => {
                scanBufferRef.current = e.target.value;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScan(e.currentTarget.value);
                  e.currentTarget.value = "";
                  scanBufferRef.current = "";
                }
              }}
            />
          </label>
        </div>
      )}

      <ErrorBanner message={error} />
      {scanMessage && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{scanMessage}</p>
      )}

      <AdminModal
        open={showForm}
        onClose={closeModal}
        title={editingId ? `Edit Part${form.category ? ` · ${form.category}` : ""}` : "Add Part"}
        wide
      >
        <form onSubmit={saveItem} className="space-y-5">
          <FormSection title="Part identification" description="Name, barcode, and inventory category.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Part name" htmlFor="inv-name" required className="sm:col-span-2">
                <input
                  id="inv-name"
                  className={inputClass}
                  placeholder="e.g. Oil filter — 5W-30 compatible"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Part number" htmlFor="inv-part-number" hint="Manufacturer or internal part number." className="sm:col-span-2">
                <input
                  id="inv-part-number"
                  className={inputClass}
                  placeholder="e.g. OF-1234"
                  value={form.partNumber}
                  onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
                />
              </FormField>
              <FormField label="SKU / barcode" htmlFor="inv-sku" hint="Used for barcode scanning and lookups.">
                <input
                  id="inv-sku"
                  className={inputClass}
                  placeholder="Scan or enter SKU"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </FormField>
              <FormField label="Category" className="sm:col-span-2" hint="Groups this part under Inventory → All parts.">
                <SearchableSelect
                  value={form.category}
                  onChange={(category) => setForm({ ...form, category })}
                  options={categoryOptions(form.category)}
                  placeholder="Select category"
                  closeSignal={closeDropdowns}
                  className={inputClass}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Stock levels" description="Current quantity and reorder threshold.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Current quantity" htmlFor="inv-qty">
                <input
                  id="inv-qty"
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </FormField>
              <FormField label="Minimum stock" htmlFor="inv-min" hint="Low-stock alerts trigger at or below this level.">
                <input
                  id="inv-min"
                  className={inputClass}
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Pricing & supplier" description="Unit cost and vendor information.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Unit cost ($)" htmlFor="inv-cost">
                <input
                  id="inv-cost"
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                />
              </FormField>
              <FormField label="Supplier / vendor" htmlFor="inv-supplier">
                <input
                  id="inv-supplier"
                  className={inputClass}
                  placeholder="e.g. NAPA, AutoZone"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Storage" description="Assign this part to a fleet vehicle from Fleet Manager.">
            <FormField
              label="Shop location / vehicle"
              htmlFor="inv-vehicle"
              hint={
                fleetOptions.length
                  ? "Parts are linked to fleet vehicles so you can track what is on each van or truck."
                  : "Add vehicles in Fleet Manager first, then assign parts here."
              }
            >
              <select
                id="inv-vehicle"
                className={inputClass}
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                disabled={!fleetOptions.length}
              >
                <option value="">Not assigned to a vehicle</option>
                {fleetOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatFleetVehicleOption(vehicle)}
                    {vehicle.status !== "active" ? ` — ${vehicle.status.replace("_", " ")}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          </FormSection>

          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <button type="submit" className={btnPrimary}>{editingId ? "Save changes" : "Save part"}</button>
            <button type="button" onClick={closeModal} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading inventory…</p>
      ) : !filtered.length ? (
        <EmptyState icon={Package} title={lowStockOnly ? "All stocked up" : "No inventory yet"} text="Add your first part to get started." />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, items: categoryItems }) => (
            <section key={category} className="overflow-hidden rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">{category}</h2>
                  <p className="text-xs text-slate-500">{categoryItems.length} part{categoryItems.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Part</th>
                      <th className="hidden px-4 py-3 sm:table-cell">SKU</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="hidden px-4 py-3 lg:table-cell">Supplier</th>
                      <th className="hidden px-4 py-3 md:table-cell">Vehicle</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {categoryItems.map((item) => (
                      <tr key={item.id} className="bg-slate-950/20 transition hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.quantity <= item.minStock && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}
                            <div className="min-w-0">
                              <p className="font-medium text-white">{item.name}</p>
                              <p className="text-xs text-slate-400">
                                Part #{" "}
                                <span className="font-mono text-slate-300">{item.partNumber?.trim() || "—"}</span>
                              </p>
                              <p className="text-xs text-slate-500 md:hidden">{resolveInventoryVehicle(item, fleet)}</p>
                              <p className="text-xs text-slate-500">${item.unitCost.toFixed(2)} each</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-slate-400 sm:table-cell">{item.sku || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => adjustStock(item, -1)} className={btnSecondary} aria-label="Decrease stock">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className={item.quantity <= item.minStock ? "font-semibold text-amber-300" : "text-slate-300"}>{item.quantity}</span>
                            <button type="button" onClick={() => adjustStock(item, 1)} className={btnSecondary} aria-label="Increase stock">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-slate-600">/ {item.minStock}</span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{item.supplier || "—"}</td>
                        <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                          {resolveInventoryVehicle(item, fleet)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => startEdit(item)} className={btnSecondary} aria-label={`Edit ${item.name}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => remove(item.id)} className={btnDanger} aria-label={`Remove ${item.name}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
