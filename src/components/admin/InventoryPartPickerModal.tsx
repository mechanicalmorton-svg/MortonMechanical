"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import type { InventoryItem } from "@/lib/shop-types";
import {
  resolveCategoryFlags,
  type InventoryCategorySettingsMap,
} from "@/lib/inventory-categories";
import { adminGet } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { btnPrimary, btnSecondary, inputClass } from "./admin-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when a part is chosen from All parts inventory. */
  onPick: (item: InventoryItem, qty: number) => void | Promise<void>;
  stacked?: boolean;
  busy?: boolean;
};

export function InventoryPartPickerModal({ open, onClose, onPick, stacked, busy }: Props) {
  const toast = useAdminToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categorySettings, setCategorySettings] = useState<InventoryCategorySettingsMap>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [pickingId, setPickingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [inventoryRes, categoriesRes] = await Promise.all([
      adminGet<InventoryItem[]>("/api/admin/inventory"),
      adminGet<{ categories: string[]; settings?: InventoryCategorySettingsMap }>(
        "/api/admin/inventory/categories",
      ),
    ]);
    if (inventoryRes.error) toast.error(inventoryRes.error);
    else setItems(inventoryRes.data ?? []);
    if (categoriesRes.error) toast.error(categoriesRes.error);
    else setCategorySettings(categoriesRes.data?.settings ?? {});
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setQtyById({});
    setPickingId(null);
    void load();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = items.filter((item) => {
      const category = item.category?.trim() || "General";
      const flags = resolveCategoryFlags(category, categorySettings);
      return flags.enabled && flags.showInWorkOrders;
    });
    const list = !q
      ? visible
      : visible.filter((item) =>
          [item.name, item.partNumber, item.sku, item.category, item.location]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q)),
        );
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search, categorySettings]);

  async function pick(item: InventoryItem) {
    const qty = Math.max(1, Math.floor(qtyById[item.id] ?? 1));
    if (item.quantity < qty) {
      toast.error(`Only ${item.quantity} in stock for “${item.name}”.`);
      return;
    }
    setPickingId(item.id);
    try {
      await onPick(item, qty);
      setQtyById((current) => ({ ...current, [item.id]: 1 }));
      void load();
    } finally {
      setPickingId(null);
    }
  }

  return (
    <AdminModal open={open} onClose={onClose} title="Add parts from inventory" wide stacked={stacked}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Pull from All parts inventory categories enabled for work orders. Adding a part puts it on
          the work order and reduces stock.
        </p>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search name, part #, SKU, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </label>

        <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/30 p-2">
          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Loading inventory…</p>
          ) : !filtered.length ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No matching parts in work-order categories. Founders can enable categories under Inventory →
              Manage Categories.
            </p>
          ) : (
            filtered.map((item) => {
              const qty = qtyById[item.id] ?? 1;
              const outOfStock = item.quantity <= 0;
              const adding = pickingId === item.id || busy;
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-700 hover:bg-slate-900/70"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-0.5 text-[13px] font-medium text-slate-200">
                      {[item.partNumber || item.sku, item.category].filter(Boolean).join(" · ") || "Part"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.quantity} in stock · ${(item.sellPrice ?? 0).toFixed(2)} sell
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, item.quantity)}
                      className={`${inputClass} w-20 !py-2 text-center`}
                      value={qty}
                      disabled={outOfStock || adding}
                      onChange={(e) =>
                        setQtyById((current) => ({
                          ...current,
                          [item.id]: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      aria-label={`Quantity for ${item.name}`}
                    />
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={outOfStock || adding}
                      onClick={() => void pick(item)}
                    >
                      {adding ? "Adding…" : outOfStock ? "Out of stock" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
