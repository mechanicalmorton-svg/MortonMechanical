"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Barcode, Minus, Package, Pencil, Plus, Trash2 } from "lucide-react";
import type { InventoryItem } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
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
];

const emptyForm = {
  name: "",
  sku: "",
  category: "General",
  quantity: "0",
  minStock: "1",
  unitCost: "0",
  supplier: "",
  location: "",
};

export function InventoryPanel({ lowStockOnly }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
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
    const { data, error: message } = await adminGet<InventoryItem[]>("/api/admin/inventory");
    if (message) setError(message);
    else setItems(data ?? []);
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
        if (adjustError) setError(adjustError);
        else {
          setScanMessage(`Added 1 to ${updated?.name ?? item.name} (${sku}). Stock: ${updated?.quantity ?? item.quantity + 1}`);
          load();
        }
        return;
      }

      setScanMessage(`SKU "${sku}" not found — opening add form.`);
      setEditingId(null);
      setForm({ ...emptyForm, sku });
      setShowForm(true);
    },
    [closeAllDropdowns],
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

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      ...form,
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
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: String(item.quantity),
      minStock: String(item.minStock),
      unitCost: String(item.unitCost),
      supplier: item.supplier ?? "",
      location: item.location ?? "",
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
          {!lowStockOnly && (
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
          )}
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(!showForm);
            }}
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" /> Add Inventory
          </button>
        </div>
      </div>

      {scanMode && !lowStockOnly && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-200">Barcode scan mode active</p>
          <p className="mt-1 text-xs text-emerald-100/80">
            Scan a barcode to add 1 to stock. Unknown SKUs open the add form. Dropdowns close automatically after each scan.
          </p>
          <input
            ref={scanInputRef}
            className="sr-only"
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
        </div>
      )}

      <ErrorBanner message={error} />
      {scanMessage && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{scanMessage}</p>
      )}

      {showForm && (
        <form onSubmit={saveItem} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className={inputClass} placeholder="Part name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} placeholder="SKU / barcode" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <label className="block text-sm text-slate-400">
            Category
            <SearchableSelect
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              options={CATEGORIES}
              placeholder="Category"
              closeSignal={closeDropdowns}
              className={`${inputClass} mt-1`}
            />
          </label>
          <input className={inputClass} type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className={inputClass} type="number" placeholder="Min stock" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <input className={inputClass} type="number" step="0.01" placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          <input className={inputClass} placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <input className={inputClass} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>{editingId ? "Save changes" : "Save item"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading inventory…</p>
      ) : !filtered.length ? (
        <EmptyState icon={Package} title={lowStockOnly ? "All stocked up" : "No inventory yet"} text="Add your first part to get started." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Part</th>
                <th className="hidden px-4 py-3 sm:table-cell">SKU</th>
                <th className="px-4 py-3">Qty</th>
                <th className="hidden px-4 py-3 md:table-cell">Category</th>
                <th className="hidden px-4 py-3 lg:table-cell">Location</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((item) => (
                <tr key={item.id} className="bg-slate-950/20 transition hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.quantity <= item.minStock && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />}
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
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
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">{item.category}</td>
                  <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{item.location ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => startEdit(item)} className={btnSecondary}><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => remove(item.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
