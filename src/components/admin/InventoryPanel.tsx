"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Package, Plus, Trash2 } from "lucide-react";
import type { InventoryItem } from "@/lib/shop-types";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

type Props = { lowStockOnly?: boolean };

export function InventoryPanel({ lowStockOnly }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "General", quantity: "0", minStock: "1", unitCost: "0", supplier: "", location: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/inventory");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = lowStockOnly ? items.filter((i) => i.quantity <= i.minStock) : items;

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity), minStock: Number(form.minStock), unitCost: Number(form.unitCost) }),
    });
    setShowForm(false);
    setForm({ name: "", sku: "", category: "General", quantity: "0", minStock: "1", unitCost: "0", supplier: "", location: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this inventory item?")) return;
    await fetch("/api/admin/inventory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={lowStockOnly ? "Low Stock Alerts" : "Inventory"}
          subtitle={lowStockOnly ? "Parts at or below minimum stock levels." : "Manage parts, fluids, and shop supplies."}
        />
        <button type="button" onClick={() => setShowForm(!showForm)} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Add Inventory
        </button>
      </div>

      {showForm && (
        <form onSubmit={addItem} className="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <input className={inputClass} placeholder="Part name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className={inputClass} placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className={inputClass} type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className={inputClass} type="number" placeholder="Min stock" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <input className={inputClass} type="number" step="0.01" placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          <input className={inputClass} placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <input className={inputClass} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className={btnPrimary}>Save item</button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
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
                  <td className="hidden px-4 py-3 text-slate-400 sm:table-cell">{item.sku}</td>
                  <td className="px-4 py-3">
                    <span className={item.quantity <= item.minStock ? "font-semibold text-amber-300" : "text-slate-300"}>
                      {item.quantity}
                    </span>
                    <span className="text-slate-600"> / {item.minStock}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">{item.category}</td>
                  <td className="hidden px-4 py-3 text-slate-400 lg:table-cell">{item.location ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => remove(item.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
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
