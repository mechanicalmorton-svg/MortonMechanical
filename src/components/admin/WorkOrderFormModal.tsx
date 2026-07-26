"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Plus, UserRound } from "lucide-react";
import type { CustomerVehicle, Priority, StaffMember, WorkOrder, WorkOrderStatus } from "@/lib/shop-types";
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  normalizeWorkOrderStatus,
} from "@/lib/work-order-status";
import { formatCustomerVehicleOption, parseWorkOrderVehicleLabel } from "@/lib/customer-vehicles";
import { adminGet, adminSend } from "./admin-fetch";
import { CustomerPickerModal, type CustomerWithVehicles } from "./CustomerPickerModal";
import { useAdminToast } from "./AdminToast";
import { btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";
import { VehicleMakeModelFields } from "./VehicleMakeModelFields";

type MakeOption = { id: number; name: string };

const YEARS = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => String(new Date().getFullYear() - i));
const POWERTRAINS = ["Gasoline", "Diesel", "Hybrid", "Electric", "Other"];

const emptyVehicle = {
  year: String(new Date().getFullYear()),
  make: "",
  makeId: null as number | null,
  model: "",
  trim: "",
  vin: "",
  plate: "",
  powertrain: "",
  vehicleNotes: "",
};

const emptyForm = {
  customerAddress: "",
  customerConcern: "",
  service: "",
  status: "draft" as WorkOrderStatus,
  priority: "normal" as Priority,
  internalNotes: "",
  notes: "",
  assignedTo: "",
  scheduledDate: "",
  ...emptyVehicle,
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
  editingOrder?: WorkOrder | null;
  staff: StaffMember[];
};

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
      {hint ? <p className="mt-0.5 text-xs font-normal text-slate-500">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function vehicleFromRecord(vehicle?: CustomerVehicle | null) {
  if (!vehicle) return { ...emptyVehicle };
  return {
    year: vehicle.year ? String(vehicle.year) : emptyVehicle.year,
    make: vehicle.make ?? "",
    makeId: null as number | null,
    model: vehicle.model ?? "",
    trim: vehicle.trim ?? "",
    vin: vehicle.vin ?? "",
    plate: vehicle.plate ?? "",
    powertrain: vehicle.powertrain ?? "",
    vehicleNotes: vehicle.notes ?? "",
  };
}

function vehicleFromWorkOrderLabel(label: string) {
  const parsed = parseWorkOrderVehicleLabel(label);
  return {
    ...emptyVehicle,
    year: parsed.year ? String(parsed.year) : emptyVehicle.year,
    make: parsed.make ?? "",
    model: parsed.model ?? "",
    trim: parsed.trim ?? "",
    plate: parsed.plate ?? "",
  };
}

function vehiclePayload(form: typeof emptyForm, id?: string) {
  return {
    id,
    year: form.year ? Number(form.year) : undefined,
    make: form.make || undefined,
    model: form.model || undefined,
    trim: form.trim || undefined,
    vin: form.vin || undefined,
    plate: form.plate || undefined,
    powertrain: form.powertrain || undefined,
    notes: form.vehicleNotes || undefined,
  };
}

export function WorkOrderFormModal({ onClose, onSaved, editingOrder, staff }: Props) {
  const toast = useAdminToast();
  const [form, setForm] = useState(emptyForm);
  const [customer, setCustomer] = useState<CustomerWithVehicles | null>(null);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [customerVehicleId, setCustomerVehicleId] = useState("");
  const [vehicleJobOnly, setVehicleJobOnly] = useState(true);
  const [customerCount, setCustomerCount] = useState(0);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [makes, setMakes] = useState<MakeOption[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const addressListId = useMemo(() => `wo-address-${editingOrder?.id ?? "new"}`, [editingOrder?.id]);

  useEffect(() => {
    setLoadingMakes(true);
    adminGet<MakeOption[]>("/api/admin/vehicles/makes")
      .then(({ data, error }) => {
        if (error) toast.error(error);
        else setMakes(data ?? []);
      })
      .finally(() => setLoadingMakes(false));

    adminGet<CustomerWithVehicles[]>("/api/admin/customers?includeVehicles=1").then(({ data }) => {
      const rows = data ?? [];
      setCustomerCount(rows.length);
      setAddressSuggestions([...new Set(rows.map((row) => row.address?.trim()).filter(Boolean) as string[])].sort());
    });
  }, []);

  useEffect(() => {
    if (!form.make.trim()) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    const params = new URLSearchParams({ make: form.make });
    if (form.makeId) params.set("makeId", String(form.makeId));
    if (form.year) params.set("year", form.year);
    adminGet<string[]>(`/api/admin/vehicles/models?${params}`)
      .then(({ data, error }) => {
        if (error) toast.error(error);
        else setModels(data ?? []);
      })
      .finally(() => setLoadingModels(false));
  }, [form.make, form.makeId, form.year]);

  useEffect(() => {
    async function hydrate() {
      if (!editingOrder) {
        setLoadingEdit(false);
        setForm(emptyForm);
        setCustomer(null);
        setVehicles([]);
        setCustomerVehicleId("");
        setVehicleJobOnly(true);
        setShowInternalNotes(false);
        return;
      }

      setLoadingEdit(true);

      let nextCustomer: CustomerWithVehicles | null = null;
      let vehicleList: CustomerVehicle[] = [];
      let nextCustomerVehicleId = editingOrder.customerVehicleId ?? "";
      let nextVehicleJobOnly = !editingOrder.customerVehicleId;
      let customerAddress = "";
      let vehicleForm = editingOrder.vehicle
        ? vehicleFromWorkOrderLabel(editingOrder.vehicle)
        : { ...emptyVehicle };

      if (editingOrder.customerId) {
        const [{ data: customers }, { data: customerVehicles }] = await Promise.all([
          adminGet<CustomerWithVehicles[]>("/api/admin/customers?includeVehicles=1"),
          adminGet<CustomerVehicle[]>(`/api/admin/customers/vehicles?customerId=${encodeURIComponent(editingOrder.customerId)}`),
        ]);
        const match = customers?.find((row) => row.id === editingOrder.customerId) ?? null;
        vehicleList = customerVehicles ?? match?.vehicles ?? [];
        customerAddress = match?.address ?? "";

        if (match) {
          nextCustomer = { ...match, vehicles: vehicleList };
        } else {
          nextCustomer = {
            id: editingOrder.customerId,
            name: editingOrder.customerName,
            phone: editingOrder.phone,
            createdAt: editingOrder.createdAt,
            updatedAt: editingOrder.updatedAt,
            vehicles: vehicleList,
          };
        }

        let selectedVehicle =
          vehicleList.find((vehicle) => vehicle.id === editingOrder.customerVehicleId) ?? null;

        if (!selectedVehicle && editingOrder.customerVehicleId) {
          const { data: allVehicles } = await adminGet<CustomerVehicle[]>("/api/admin/customers/vehicles");
          selectedVehicle = allVehicles?.find((vehicle) => vehicle.id === editingOrder.customerVehicleId) ?? null;
          if (selectedVehicle && !vehicleList.some((vehicle) => vehicle.id === selectedVehicle?.id)) {
            vehicleList = [selectedVehicle, ...vehicleList];
          }
        }

        if (selectedVehicle) {
          vehicleForm = vehicleFromRecord(selectedVehicle);
          nextCustomerVehicleId = selectedVehicle.id;
          nextVehicleJobOnly = false;
        } else if (editingOrder.vehicle) {
          vehicleForm = vehicleFromWorkOrderLabel(editingOrder.vehicle);
          nextCustomerVehicleId = "";
          nextVehicleJobOnly = true;
        }
      } else {
        nextCustomer = {
          id: "",
          name: editingOrder.customerName,
          phone: editingOrder.phone,
          createdAt: editingOrder.createdAt,
          updatedAt: editingOrder.updatedAt,
          vehicles: [],
        };
        if (editingOrder.vehicle) {
          vehicleForm = vehicleFromWorkOrderLabel(editingOrder.vehicle);
        }
      }

      setCustomer(nextCustomer);
      setVehicles(vehicleList);
      setCustomerVehicleId(nextCustomerVehicleId);
      setVehicleJobOnly(nextVehicleJobOnly);
      setShowInternalNotes(Boolean(editingOrder.internalNotes?.trim()));
      setForm({
        customerAddress,
        customerConcern: editingOrder.customerConcern ?? "",
        service: editingOrder.service,
        status: normalizeWorkOrderStatus(editingOrder.status),
        priority: editingOrder.priority,
        internalNotes: editingOrder.internalNotes ?? "",
        notes: editingOrder.notes ?? "",
        assignedTo: editingOrder.assignedTo ?? "",
        scheduledDate: editingOrder.scheduledDate ?? "",
        ...vehicleForm,
      });
      setLoadingEdit(false);
    }

    hydrate();
  }, [editingOrder]);

  function applyVehicle(vehicle: CustomerVehicle | null) {
    if (!vehicle) {
      setCustomerVehicleId("");
      setVehicleJobOnly(true);
      setForm((prev) => ({ ...prev, ...emptyVehicle }));
      return;
    }
    setCustomerVehicleId(vehicle.id);
    setVehicleJobOnly(false);
    setForm((prev) => ({ ...prev, ...vehicleFromRecord(vehicle) }));
  }

  async function handleCustomerSelect(selected: CustomerWithVehicles) {
    setCustomer(selected);
    setVehicles(selected.vehicles ?? []);
    setCustomerVehicleId("");
    setVehicleJobOnly(true);
    setForm((prev) => ({
      ...prev,
      ...emptyVehicle,
      customerAddress: selected.address ?? "",
    }));
    if (!selected.vehicles?.length) {
      const { data } = await adminGet<CustomerVehicle[]>(
        `/api/admin/customers/vehicles?customerId=${encodeURIComponent(selected.id)}`,
      );
      setVehicles(data ?? []);
    }
  }

  function validateVehicle(requiredMessage: string) {
    if (!form.year || !form.make.trim() || !form.model.trim() || !form.powertrain) {
      toast.error(requiredMessage);
      return false;
    }
    return true;
  }

  async function addVehicleForCustomer() {
    if (!customer?.id) {
      toast.error("Select a customer first.");
      return;
    }
    if (!validateVehicle("Year, make, model, and powertrain are required to add a vehicle.")) return;

    setAddingVehicle(true);
    const { data, error } = await adminSend<CustomerVehicle>("/api/admin/customers/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id, ...vehiclePayload(form) }),
    });
    setAddingVehicle(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Vehicle added to customer file.");
    setVehicles((prev) => [data as CustomerVehicle, ...prev]);
    applyVehicle(data as CustomerVehicle);
  }

  async function saveCustomerAddress() {
    if (!customer?.id) return;
    if ((customer.address ?? "") === form.customerAddress.trim()) return;
    const { error } = await adminSend("/api/admin/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customer.id, address: form.customerAddress.trim() }),
    });
    if (error) toast.error(error);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!customer?.id) {
      toast.error("Select a customer before saving.");
      return;
    }
    if (!validateVehicle("Year, make, model, and powertrain are required for the vehicle on this job.")) return;
    if (!editingOrder) {
      if (!form.vin.trim()) {
        toast.error("VIN is required.");
        return;
      }
      if (!form.plate.trim()) {
        toast.error("License plate is required.");
        return;
      }
      if (!form.assignedTo) {
        toast.error("Assigned to is required.");
        return;
      }
    }

    setSaving(true);
    await saveCustomerAddress();

    const payload = {
      ...(editingOrder ? { id: editingOrder.id } : {}),
      customerId: customer.id,
      customerVehicleId: customerVehicleId || undefined,
      saveVehicleToFile: !vehicleJobOnly,
      customerConcern: form.customerConcern,
      service: form.service,
      status: form.status,
      priority: form.priority,
      internalNotes: form.internalNotes,
      notes: form.notes,
      assignedTo: form.assignedTo || undefined,
      scheduledDate: form.scheduledDate || undefined,
      vehicle: vehiclePayload(form, customerVehicleId || undefined),
    };

    const { error } = await adminSend("/api/admin/work-orders", {
      method: editingOrder ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(editingOrder ? "Work order updated." : "Work order created.");
    onSaved();
    onClose();
  }

  return (
    <>
      <form onSubmit={save} className="space-y-5">
          <FormSection title="Customer" description="Link this job to a customer account. Vehicles on file stay connected to that customer.">
            <div className="space-y-4">
              <FormField
                label={`Customer${customerCount ? ` (${customerCount} available)` : ""}`}
                required
              >
                {customer?.id || customer?.name ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{customer.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact details"}
                        </p>
                        {!customer.id ? (
                          <p className="mt-1 text-xs text-amber-300">Select a customer account to link vehicles on file.</p>
                        ) : null}
                      </div>
                    </div>
                    <button type="button" onClick={() => setPickerOpen(true)} className={btnSecondary}>
                      Change
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setPickerOpen(true)} className={`${btnSecondary} w-full justify-center py-3`}>
                    Select customer
                  </button>
                )}
              </FormField>

              <FormField
                label="Customer address"
                htmlFor="wo-customer-address"
                hint="Shown on the printable work order / invoice PDF. Suggestions appear as you type."
              >
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="wo-customer-address"
                    className={`${inputClass} pl-9`}
                    list={addressListId}
                    placeholder="100 Victoria Parade, East Melbourne VIC 3002, Australia"
                    value={form.customerAddress}
                    disabled={!customer?.id}
                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                  />
                  <datalist id={addressListId}>
                    {addressSuggestions.map((address) => (
                      <option key={address} value={address} />
                    ))}
                  </datalist>
                </div>
              </FormField>

              <FormField
                label="Customer's concern"
                htmlFor="wo-customer-concern"
                hint="What the customer reported — appears on the PDF."
              >
                <textarea
                  id="wo-customer-concern"
                  className={inputClass}
                  rows={3}
                  placeholder="e.g. noise when braking, check engine light…"
                  value={form.customerConcern}
                  onChange={(e) => setForm({ ...form, customerConcern: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title="Vehicle"
            description={
              loadingEdit
                ? "Loading saved vehicle details…"
                : customer?.id
                  ? "Use a vehicle assigned to this customer, or enter details manually below."
                  : "Select a customer first to choose vehicles on file."
            }
          >
            <div className={`space-y-4 ${loadingEdit ? "pointer-events-none opacity-60" : ""}`}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <FormField
                  label="Vehicle on file"
                  htmlFor="wo-vehicle-on-file"
                  hint="Use a vehicle assigned to this customer, or enter details manually."
                >
                  <select
                    id="wo-vehicle-on-file"
                    className={inputClass}
                    value={customerVehicleId}
                    disabled={!customer?.id}
                    onChange={(e) => {
                      if (!e.target.value) {
                        applyVehicle(null);
                        return;
                      }
                      const next = vehicles.find((vehicle) => vehicle.id === e.target.value) ?? null;
                      applyVehicle(next);
                    }}
                  >
                    <option value="">
                      {customer?.id ? "Enter vehicle manually (this job only)" : "Select a customer first"}
                    </option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {formatCustomerVehicleOption(vehicle)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Can permission="customers.create">
                  <button
                    type="button"
                    onClick={addVehicleForCustomer}
                    disabled={!customer?.id || addingVehicle}
                    className={`${btnPrimary} w-full lg:w-auto`}
                  >
                    <Plus className="h-4 w-4" />
                    {addingVehicle ? "Adding…" : "Add vehicle for customer"}
                  </button>
                </Can>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Year" htmlFor="wo-year" required>
                  <select
                    id="wo-year"
                    className={inputClass}
                    value={form.year}
                    disabled={!customer?.id}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </FormField>

                <VehicleMakeModelFields
                  make={form.make}
                  makeId={form.makeId}
                  model={form.model}
                  makes={makes}
                  models={models}
                  loadingMakes={loadingMakes}
                  loadingModels={loadingModels}
                  disabled={!customer?.id}
                  required
                  onMakeChange={(make, makeId) => setForm({ ...form, make, makeId, model: "" })}
                  onModelChange={(model) => setForm({ ...form, model })}
                />

                <FormField label="Trim / variant" htmlFor="wo-trim">
                  <input
                    id="wo-trim"
                    className={inputClass}
                    placeholder="e.g. EX, Sport, Lariat"
                    value={form.trim}
                    disabled={!customer?.id}
                    onChange={(e) => setForm({ ...form, trim: e.target.value })}
                  />
                </FormField>
                <FormField label="VIN" htmlFor="wo-vin" required={!editingOrder}>
                  <input
                    id="wo-vin"
                    className={inputClass}
                    placeholder="17 characters"
                    maxLength={17}
                    value={form.vin}
                    disabled={!customer?.id}
                    onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })}
                  />
                </FormField>
                <FormField label="License plate" htmlFor="wo-plate" required={!editingOrder}>
                  <input
                    id="wo-plate"
                    className={inputClass}
                    placeholder="e.g. ABC1234"
                    value={form.plate}
                    disabled={!customer?.id}
                    onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                  />
                </FormField>
                <FormField label="Powertrain / fuel" htmlFor="wo-powertrain" required>
                  <select
                    id="wo-powertrain"
                    className={inputClass}
                    value={form.powertrain}
                    disabled={!customer?.id}
                    onChange={(e) => setForm({ ...form, powertrain: e.target.value })}
                  >
                    <option value="">Select type</option>
                    {POWERTRAINS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField
                label="Vehicle notes"
                htmlFor="wo-vehicle-notes"
                hint="Modifications, known issues, or anything not covered above."
              >
                <textarea
                  id="wo-vehicle-notes"
                  className={inputClass}
                  rows={2}
                  placeholder="e.g. aftermarket lift kit, rebuilt engine…"
                  value={form.vehicleNotes}
                  disabled={!customer?.id}
                  onChange={(e) => setForm({ ...form, vehicleNotes: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Work & assignment">
            <div className="grid gap-4">
              <FormField label="Work description" htmlFor="wo-service">
                <textarea
                  id="wo-service"
                  className={inputClass}
                  rows={3}
                  placeholder="Describe the work to be performed…"
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Status" htmlFor="wo-status" required>
                  <select
                    id="wo-status"
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrderStatus })}
                  >
                    {WORK_ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {WORK_ORDER_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Priority" htmlFor="wo-priority" required>
                  <select
                    id="wo-priority"
                    className={inputClass}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </FormField>
                <FormField label="Due date" htmlFor="wo-due-date" hint="Optional">
                  <input
                    id="wo-due-date"
                    className={inputClass}
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  />
                </FormField>
                <FormField
                  label="Assigned to"
                  htmlFor="wo-assigned"
                  required={!editingOrder}
                  hint="Staff with work order / booking access."
                >
                  <select
                    id="wo-assigned"
                    className={inputClass}
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  >
                    <option value="">Select technician</option>
                    {staff.filter((member) => member.active).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/30">
                <button
                  type="button"
                  onClick={() => setShowInternalNotes((value) => !value)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-200"
                >
                  <span>
                    Internal notes <span className="font-normal text-slate-500">(optional — shop only)</span>
                  </span>
                  {showInternalNotes ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>
                {showInternalNotes ? (
                  <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                    <textarea
                      className={inputClass}
                      rows={2}
                      placeholder="Optional internal notes for your team"
                      value={form.internalNotes}
                      onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>

              <FormField label="Notes" htmlFor="wo-notes">
                <textarea
                  id="wo-notes"
                  className={inputClass}
                  rows={2}
                  placeholder="Additional notes or special instructions…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving || loadingEdit}>
              {saving ? "Saving…" : editingOrder ? "Save changes" : "Create work order"}
            </button>
          </div>
        </form>

      <CustomerPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCustomerSelect}
        stacked
      />
    </>
  );
}
