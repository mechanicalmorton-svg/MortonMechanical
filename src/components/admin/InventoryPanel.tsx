"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Barcode, ExternalLink, FolderPlus, Minus, Package, Pencil, Plus, Trash2 } from "lucide-react";
import type { FleetVehicle, InventoryItem, StaffRole } from "@/lib/shop-types";
import {
  DEFAULT_INVENTORY_CATEGORIES,
  isDefaultInventoryCategory,
  mergeInventoryCategories,
  sortInventoryCategories,
} from "@/lib/inventory-categories";
import {
  formatFleetVehicleOption,
  resolveInventoryVehicle,
  sortFleetForSelect,
  vehicleLocationLabel,
} from "@/lib/inventory-fleet";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";
import { SearchableSelect } from "./SearchableSelect";

type Props = { lowStockOnly?: boolean; role?: StaffRole; canManageCategories?: boolean };

const emptyForm = {
  name: "",
  partNumber: "",
  sku: "",
  category: "General",
  quantity: "0",
  minStock: "1",
  unitCost: "0",
  sellPrice: "0",
  supplier: "",
  supplierLink: "",
  vehicleId: "",
};

function categoryOptions(categories: string[], current?: string) {
  return sortInventoryCategories(mergeInventoryCategories(categories, current ? [current] : []));
}

function formatUrlForDisplay(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function normalizeSupplierLink(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function groupByCategory(items: InventoryItem[], categories: string[]) {
  const map = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const category = item.category?.trim() || "Uncategorized";
    const list = map.get(category) ?? [];
    list.push(item);
    map.set(category, list);
  }

  const groups: { category: string; items: InventoryItem[] }[] = [];
  const ordered = sortInventoryCategories(mergeInventoryCategories(categories));
  for (const category of ordered) {
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

export function InventoryPanel({ lowStockOnly, canManageCategories = false }: Props) {
  const toast = useAdminToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [categories, setCategories] = useState<string[]>([...DEFAULT_INVENTORY_CATEGORIES]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [closeDropdowns, setCloseDropdowns] = useState(0);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef("");

  async function load() {
    setLoading(true);
    const [inventoryRes, fleetRes, categoriesRes] = await Promise.all([
      adminGet<InventoryItem[]>("/api/admin/inventory"),
      adminGet<FleetVehicle[]>("/api/admin/fleet"),
      adminGet<{ categories: string[] }>("/api/admin/inventory/categories"),
    ]);
    if (inventoryRes.error) toast.error(inventoryRes.error);
    else setItems(inventoryRes.data ?? []);
    if (fleetRes.error) toast.error(fleetRes.error);
    else setFleet(fleetRes.data ?? []);
    if (categoriesRes.error) toast.error(categoriesRes.error);
    else setCategories(categoriesRes.data?.categories?.length ? categoriesRes.data.categories : [...DEFAULT_INVENTORY_CATEGORIES]);
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

      const { data: item, error: lookupError } = await adminGet<InventoryItem | null>(
        `/api/admin/inventory?sku=${encodeURIComponent(sku)}`,
      );
      if (lookupError) {
        toast.error(lookupError);
        return;
      }

      if (item) {
        const { data: updated, error: adjustError } = await adminSend<InventoryItem>("/api/admin/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sku, adjust: 1 }),
        });
        if (adjustError) {
          toast.error(adjustError);
          return;
        }

        const nextItem = updated ?? { ...item, quantity: item.quantity + 1 };
        setItems((prev) => prev.map((row) => (row.id === nextItem.id ? nextItem : row)));
        toast.success(`+1 ${nextItem.name} (${sku}) — stock now ${nextItem.quantity}`);
        return;
      }

      if (showForm && !editingId) {
        setForm((prev) => ({ ...prev, sku }));
        toast.info(`Barcode ${sku} added to the form — complete details and click Save part.`);
        return;
      }

      toast.info(`SKU "${sku}" not found. Click Add Part to create a new inventory item.`);
    },
    [closeAllDropdowns, showForm, editingId, toast],
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

  const filtered = lowStockOnly
    ? items.filter((item) => item.minStock > 0 && item.quantity <= item.minStock)
    : items;
  const grouped = groupByCategory(filtered, categories);
  const fleetOptions = sortFleetForSelect(fleet);
  const customCategories = categories.filter((name) => !isDefaultInventoryCategory(name));

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageCategories) return;
    setSavingCategory(true);
    const { data, error } = await adminSend<{ categories: string[] }>("/api/admin/inventory/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });
    setSavingCategory(false);
    if (error || !data) {
      toast.error(error || "Could not add category.");
      return;
    }
    setCategories(data.categories);
    setForm((prev) => ({ ...prev, category: newCategoryName.trim() || prev.category }));
    setNewCategoryName("");
    setShowCategoryModal(false);
    toast.success("Category added.");
  }

  async function removeCategory(name: string) {
    if (!canManageCategories) return;
    if (!window.confirm(`Delete category “${name}”? Parts must be moved out of it first.`)) return;
    const { data, error } = await adminSend<{ categories: string[] }>("/api/admin/inventory/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (error || !data) {
      toast.error(error || "Could not delete category.");
      return;
    }
    setCategories(data.categories);
    if (form.category === name) setForm((prev) => ({ ...prev, category: "General" }));
    toast.success("Category deleted.");
  }

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
      sellPrice: Number(form.sellPrice),
      supplierLink: normalizeSupplierLink(form.supplierLink) || undefined,
    };
    const { error: message } = await adminSend("/api/admin/inventory", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (message) toast.error(message);
    else {
      closeModal();
      toast.success(editingId ? "Part updated." : "Part saved.");
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
      sellPrice: String(item.sellPrice ?? 0),
      supplier: item.supplier ?? "",
      supplierLink: item.supplierLink ?? "",
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
    if (message) toast.error(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this inventory item?")) return;
    const { error: message } = await adminSend("/api/admin/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={lowStockOnly ? "Low Stock Alerts" : "Inventory"}
        subtitle={
          lowStockOnly
            ? "Parts at or below a minimum greater than zero. Items with minimum stock set to 0 are ignored."
            : "Manage parts, fluids, and shop supplies."
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setScanMode((v) => !v)}
              className={scanMode ? `${btnPrimary} ring-2 ring-emerald-400/40` : btnSecondary}
            >
              <Barcode className="h-4 w-4" />
              {scanMode ? "Scan mode on" : "Barcode scan"}
            </button>
            {canManageCategories && !lowStockOnly ? (
              <button
                type="button"
                onClick={() => {
                  setNewCategoryName("");
                  setShowCategoryModal(true);
                }}
                className={btnSecondary}
              >
                <FolderPlus className="h-4 w-4" /> Add Category
              </button>
            ) : null}
            <Can permission="inventory.create">
              <button type="button" onClick={openAddModal} className={btnPrimary}>
                <Plus className="h-4 w-4" /> {lowStockOnly ? "Add Part" : "Add Inventory"}
              </button>
            </Can>
          </>
        }
      />

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
                  options={categoryOptions(categories, form.category)}
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

          <FormSection title="Pricing & supplier" description="Cost, sell price, and vendor information.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
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
                <FormField label="Sell price ($)" htmlFor="inv-sell-price" hint="Customer-facing price for this part.">
                  <input
                    id="inv-sell-price"
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellPrice}
                    onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="space-y-4">
                <FormField label="Supplier / vendor" htmlFor="inv-supplier">
                  <input
                    id="inv-supplier"
                    className={inputClass}
                    placeholder="e.g. NAPA, AutoZone"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  />
                </FormField>
                <FormField label="Vendor link" htmlFor="inv-supplier-link" hint="Product page or ordering link from the supplier.">
                  <input
                    id="inv-supplier-link"
                    className={inputClass}
                    type="url"
                    placeholder="https://supplier.com/part/123"
                    value={form.supplierLink}
                    onChange={(e) => setForm({ ...form, supplierLink: e.target.value })}
                  />
                </FormField>
              </div>
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
                            {item.minStock > 0 && item.quantity <= item.minStock && (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white">{item.name}</p>
                              <p className="text-xs text-slate-400">
                                Part #{" "}
                                <span className="font-mono text-slate-300">{item.partNumber?.trim() || "—"}</span>
                              </p>
                              <p className="text-xs text-slate-500 md:hidden">{resolveInventoryVehicle(item, fleet)}</p>
                              <p className="text-xs text-slate-500">${item.unitCost.toFixed(2)} cost</p>
                              <p className="text-xs text-emerald-400/90">${(item.sellPrice ?? 0).toFixed(2)} sell</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-slate-400 sm:table-cell">{item.sku || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Can permission="inventory.adjust">
                              <button type="button" onClick={() => adjustStock(item, -1)} className={btnSecondary} aria-label="Decrease stock">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                            </Can>
                            <span
                              className={
                                item.minStock > 0 && item.quantity <= item.minStock
                                  ? "font-semibold text-amber-300"
                                  : "text-slate-300"
                              }
                            >
                              {item.quantity}
                            </span>
                            <Can permission="inventory.adjust">
                              <button type="button" onClick={() => adjustStock(item, 1)} className={btnSecondary} aria-label="Increase stock">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </Can>
                            <span className="text-slate-600">/ {item.minStock}</span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">
                          <p>{item.supplier || "—"}</p>
                          {item.supplierLink ? (
                            <a
                              href={normalizeSupplierLink(item.supplierLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-sky-400 transition hover:text-sky-300"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {formatUrlForDisplay(item.supplierLink)}
                            </a>
                          ) : null}
                        </td>
                        <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                          {resolveInventoryVehicle(item, fleet)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Can permission="inventory.edit">
                              <button type="button" onClick={() => startEdit(item)} className={btnSecondary} aria-label={`Edit ${item.name}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </Can>
                            <Can permission="inventory.delete">
                              <button type="button" onClick={() => remove(item.id)} className={btnDanger} aria-label={`Remove ${item.name}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </Can>
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

      <AdminModal
        open={showCategoryModal}
        onClose={() => {
          if (savingCategory) return;
          setShowCategoryModal(false);
          setNewCategoryName("");
        }}
        title="Add Category"
      >
        <form onSubmit={saveCategory} className="space-y-5">
          <p className="text-sm text-slate-400">
            Create a custom inventory category for your shop. It will show up in Add/Edit Part and in the All parts list.
          </p>
          <FormField label="Category name" htmlFor="inv-new-category" required hint="Example: Suspension, Exhaust, Hardware">
            <input
              id="inv-new-category"
              className={inputClass}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Suspension"
              maxLength={48}
              required
              autoFocus
            />
          </FormField>

          {customCategories.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Custom categories</p>
              <ul className="mt-2 space-y-1.5">
                {customCategories.map((name) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => removeCategory(name)}
                      className={btnDanger}
                      aria-label={`Delete category ${name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setShowCategoryModal(false);
                setNewCategoryName("");
              }}
              disabled={savingCategory}
            >
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={savingCategory || !newCategoryName.trim()}>
              <FolderPlus className="h-4 w-4" />
              {savingCategory ? "Saving…" : "Add Category"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
