"use client";

import { useEffect, useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import type { Customer, CustomerVehicle } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { btnPrimary, btnSecondary, inputClass } from "./admin-ui";

export type CustomerWithVehicles = Customer & { vehicles: CustomerVehicle[] };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerWithVehicles) => void;
  stacked?: boolean;
};

export function CustomerPickerModal({ open, onClose, onSelect, stacked }: Props) {
  const toast = useAdminToast();
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "" });

  async function load(query = search) {
    setLoading(true);
    const params = new URLSearchParams({ includeVehicles: "1" });
    if (query.trim()) params.set("q", query.trim());
    const { data, error } = await adminGet<CustomerWithVehicles[]>(`/api/admin/customers?${params}`);
    if (error) toast.error(error);
    else setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setShowCreate(false);
    setNewCustomer({ name: "", phone: "", email: "", address: "" });
    load("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => load(search), 200);
    return () => window.clearTimeout(timer);
  }, [search, open]);

  const filteredCount = customers.length;

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    setCreating(true);
    const { data, error } = await adminSend<Customer>("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });
    setCreating(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Customer created.");
    onSelect({ ...(data as Customer), vehicles: [] });
    onClose();
  }

  return (
    <AdminModal open={open} onClose={onClose} title="Select Customer" wide stacked={stacked}>
      <div className="space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search customers by name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {loading ? "Loading customers…" : `${filteredCount} customer${filteredCount === 1 ? "" : "s"} available`}
          </p>
          <button type="button" onClick={() => setShowCreate((v) => !v)} className={btnSecondary}>
            <Plus className="h-4 w-4" />
            + Create new customer
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createCustomer} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <p className="mb-3 text-sm font-medium text-white">New customer</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Full name *"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                required
              />
              <input
                className={inputClass}
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" className={btnPrimary} disabled={creating}>
                {creating ? "Saving…" : "Save customer"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className={btnSecondary}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/30 p-2">
          {!loading && !customers.length ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No customers found. Create one to get started.</p>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  onSelect(customer);
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-slate-700 hover:bg-slate-900/70"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-white">{customer.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {customer.vehicles.length} vehicle{customer.vehicles.length === 1 ? "" : "s"} on file
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </AdminModal>
  );
}
