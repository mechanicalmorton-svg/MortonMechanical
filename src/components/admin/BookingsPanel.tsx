"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ExternalLink, MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { formatCustomerVehicleOption } from "@/lib/customer-vehicles";
import type {
  Booking,
  BookingLocationType,
  CustomerVehicle,
  ShopService,
  StaffMember,
} from "@/lib/shop-types";
import { SHOP_SERVICE_CATEGORIES } from "@/lib/shop-types";
import { adminGet, adminSend, asStaffList } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { CustomerPickerModal, type CustomerWithVehicles } from "./CustomerPickerModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";
import { CustomerVehicleDetailModal } from "./CustomerVehicleDetailModal";

const LOCATION_TYPES: { id: BookingLocationType; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "business", label: "Business" },
  { id: "apartment", label: "Apartment" },
  { id: "roadside", label: "Roadside" },
  { id: "other", label: "Other" },
];

const emptyForm = {
  customerId: "",
  customerVehicleId: "",
  assignedTo: "",
  customerName: "",
  phone: "",
  email: "",
  serviceId: "",
  service: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  address: "",
  locationType: "home" as BookingLocationType | "",
  gateCode: "",
  accessNotes: "",
  lat: "",
  lng: "",
  problemDescription: "",
  durationMinutes: "60",
  notes: "",
  status: "pending" as Booking["status"],
};

const emptyServiceForm = {
  id: "",
  name: "",
  category: "Custom Repairs",
  description: "",
  estimatedDurationMinutes: "60",
  laborHours: "1",
  startingPrice: "0",
  warranty: "",
  active: true,
};

function formatOrderNumber(id: string) {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `WO-${compact.slice(-12) || id.slice(0, 12).toUpperCase()}`;
}

export function BookingsPanel() {
  const toast = useAdminToast();
  const [items, setItems] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [savingService, setSavingService] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customerVehicles, setCustomerVehicles] = useState<CustomerVehicle[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [vehicleDetailId, setVehicleDetailId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [bookings, team, catalog] = await Promise.all([
      adminGet<Booking[]>("/api/admin/bookings"),
      adminGet<StaffMember[] | { staff: StaffMember[] }>("/api/admin/staff"),
      adminGet<ShopService[]>("/api/admin/services"),
    ]);
    if (bookings.error) toast.error(bookings.error);
    else setItems(bookings.data ?? []);
    if (team.error) toast.error(team.error);
    else setStaff(asStaffList<StaffMember>(team.data));
    if (catalog.error) {
      // Catalog optional until SQL migration is run.
      setServices([]);
    } else {
      setServices(catalog.data ?? []);
    }
    setLoading(false);
  }

  const activeServices = useMemo(() => services.filter((item) => item.active), [services]);

  function applyCatalogService(serviceId: string) {
    const selected = services.find((item) => item.id === serviceId);
    if (!selected) {
      setForm((prev) => ({ ...prev, serviceId: "", service: prev.service }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      serviceId: selected.id,
      service: selected.name,
      durationMinutes: String(selected.estimatedDurationMinutes || 60),
    }));
  }

  useEffect(() => {
    load();
  }, []);

  const activeStaff = useMemo(() => staff.filter((member) => member.active), [staff]);

  function staffName(id?: string) {
    if (!id) return "Unassigned";
    return staff.find((member) => member.id === id)?.name ?? "Unassigned";
  }

  function openCreate() {
    setCustomerVehicles([]);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setPendingPhotos([]);
    setShowForm(true);
  }

  function applyCoords(lat: number, lng: number, successMessage: string) {
    setForm((prev) => ({
      ...prev,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    }));
    setPinning(false);
    toast.success(successMessage);
  }

  function parseCoordsFromText(text: string): { lat: number; lng: number } | null {
    const trimmed = text.trim();
    // "39.7392, -104.9903" or "39.7392,-104.9903"
    const pair = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (pair) {
      const lat = Number(pair[1]);
      const lng = Number(pair[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    // Google Maps style .../@39.7392,-104.9903,17z or ?q=39.7392,-104.9903
    const at = trimmed.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (at) {
      const lat = Number(at[1]);
      const lng = Number(at[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    const q = trimmed.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
    if (q) {
      const lat = Number(q[1]);
      const lng = Number(q[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  }

  async function pinFromAddress() {
    const address = form.address.trim();
    if (!address) {
      toast.error("Enter the job address first, then pin from address.");
      return;
    }

    const pasted = parseCoordsFromText(address);
    if (pasted) {
      applyCoords(pasted.lat, pasted.lng, "Coordinates read from address field.");
      return;
    }

    setPinning(true);
    const { data, error } = await adminGet<{ lat: number; lng: number; label?: string }>(
      `/api/admin/bookings/geocode?address=${encodeURIComponent(address)}`,
    );
    if (error || data?.lat == null || data?.lng == null) {
      setPinning(false);
      toast.error(error || "Could not pin that address.");
      return;
    }
    applyCoords(data.lat, data.lng, "Pinned from job address.");
  }

  function captureMyLocation() {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      toast.error(
        "Browsers only share GPS on HTTPS or http://localhost. Open http://localhost:3000 (not a 192.168.x.x address).",
      );
      return;
    }
    if (!navigator.geolocation) {
      toast.error("GPS is not available in this browser.");
      return;
    }

    setPinning(true);
    // No timeout — desktop Wi‑Fi location can take a while. Accept any cached fix.
    navigator.geolocation.getCurrentPosition(
      (pos) => applyCoords(pos.coords.latitude, pos.coords.longitude, "Pinned from your current location."),
      (error) => {
        setPinning(false);
        if (error.code === 1) {
          toast.error(
            "Location permission is blocked. Prefer “Pin address”, or allow location in the address-bar lock icon.",
          );
          return;
        }
        toast.error("Device GPS timed out. Use “Pin address” for the job site instead.");
      },
      {
        enableHighAccuracy: false,
        maximumAge: Infinity,
        timeout: Infinity,
      },
    );
  }

  async function uploadPendingPhotos(bookingId: string) {
    for (const file of pendingPhotos) {
      const body = new FormData();
      body.set("bookingId", bookingId);
      body.set("file", file);
      const { error } = await adminSend("/api/admin/bookings/media", { method: "POST", body });
      if (error) throw new Error(error);
    }
  }

  function handleCustomerSelect(customer: CustomerWithVehicles) {
    const vehicles = customer.vehicles ?? [];
    setCustomerVehicles(vehicles);
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? prev.address,
      customerVehicleId: vehicles[0]?.id ?? "",
    }));
    setPickerOpen(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error("Select or enter a customer with a phone number.");
      return;
    }
    if (!form.customerVehicleId) {
      toast.error("Select a customer vehicle for this booking.");
      return;
    }
    if (!form.assignedTo) {
      toast.error("Assign a technician so the booking can sync to My Route Today.");
      return;
    }

    setSaving(true);
    const { data, error: message } = await adminSend<
      Booking & {
        orchestration?: {
          spawnedWorkOrder?: boolean;
          syncedRouteStop?: boolean;
          skippedReason?: string;
          workOrderId?: string;
        };
      }
    >("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        locationType: form.locationType || undefined,
        gateCode: form.gateCode.trim() || undefined,
        accessNotes: form.accessNotes.trim() || undefined,
        lat: form.lat.trim() ? Number(form.lat) : undefined,
        lng: form.lng.trim() ? Number(form.lng) : undefined,
        durationMinutes: Number(form.durationMinutes) || 60,
      }),
    });
    if (message) {
      setSaving(false);
      toast.error(message);
      return;
    }

    if (data?.id && pendingPhotos.length) {
      try {
        await uploadPendingPhotos(data.id);
      } catch (err) {
        setSaving(false);
        toast.error(err instanceof Error ? err.message : "Booking saved, but a photo failed to upload.");
        setShowForm(false);
        load();
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    setPendingPhotos([]);
    if (data?.orchestration?.spawnedWorkOrder) {
      toast.success("Booking saved — work order created and linked.");
    } else if (data?.orchestration?.skippedReason) {
      toast.success(`Booking saved. ${data.orchestration.skippedReason}`);
    } else {
      toast.success("Booking saved to the database.");
    }
    load();
  }

  async function removePhoto(bookingId: string, photoUrl: string) {
    const { error: message } = await adminSend("/api/admin/bookings/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, photoUrl }),
    });
    if (message) toast.error(message);
    else load();
  }

  async function addPhotoToBooking(bookingId: string, file: File) {
    const body = new FormData();
    body.set("bookingId", bookingId);
    body.set("file", file);
    const { error } = await adminSend("/api/admin/bookings/media", { method: "POST", body });
    if (error) toast.error(error);
    else {
      toast.success("Photo added.");
      load();
    }
  }

  async function setStatus(id: string, status: Booking["status"]) {
    const { data, error: message } = await adminSend<
      Booking & {
        orchestration?: {
          spawnedWorkOrder?: boolean;
          syncedRouteStop?: boolean;
          skippedReason?: string;
        };
      }
    >("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (message) {
      toast.error(message);
      return;
    }
    if (data?.orchestration?.spawnedWorkOrder || data?.orchestration?.syncedRouteStop) {
      toast.success("Booking updated — work order and route synced.");
    } else if (data?.orchestration?.skippedReason) {
      toast.error(data.orchestration.skippedReason);
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking?")) return;
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else load();
  }

  function editService(item: ShopService) {
    setServiceForm({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description ?? "",
      estimatedDurationMinutes: String(item.estimatedDurationMinutes || 60),
      laborHours: String(item.laborHours || 1),
      startingPrice: String(item.startingPrice || 0),
      warranty: item.warranty ?? "",
      active: item.active,
    });
  }

  async function saveService(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      toast.error("Service name is required.");
      return;
    }
    setSavingService(true);
    const { error: message } = await adminSend("/api/admin/services", {
      method: serviceForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: serviceForm.id || undefined,
        name: serviceForm.name.trim(),
        category: serviceForm.category,
        description: serviceForm.description.trim() || undefined,
        estimatedDurationMinutes: Number(serviceForm.estimatedDurationMinutes) || 60,
        laborHours: Number(serviceForm.laborHours) || 1,
        startingPrice: Number(serviceForm.startingPrice) || 0,
        warranty: serviceForm.warranty.trim() || undefined,
        active: serviceForm.active,
      }),
    });
    setSavingService(false);
    if (message) {
      toast.error(message);
      return;
    }
    toast.success(serviceForm.id ? "Service updated." : "Service added.");
    setServiceForm(emptyServiceForm);
    const catalog = await adminGet<ShopService[]>("/api/admin/services");
    if (!catalog.error) setServices(catalog.data ?? []);
  }

  async function removeService(id: string) {
    if (!confirm("Delete this service from the catalog?")) return;
    const { error: message } = await adminSend("/api/admin/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) {
      toast.error(message);
      return;
    }
    toast.success("Service deleted.");
    if (serviceForm.id === id) setServiceForm(emptyServiceForm);
    setServices((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bookings"
          subtitle="Appointments that coordinate vehicles, work orders, routes, services, and job-site access details."
        />
        <div className="flex flex-wrap gap-2">
          <Can permission="bookings.edit">
            <button
              type="button"
              onClick={() => {
                setServiceForm(emptyServiceForm);
                setShowServices(true);
              }}
              className={btnSecondary}
            >
              Manage services
            </button>
          </Can>
          <Can permission="bookings.create">
            <button type="button" onClick={openCreate} className={btnPrimary}>
              <Plus className="h-4 w-4" /> New Booking
            </button>
          </Can>
        </div>
      </div>

      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="New Booking" wide>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {form.customerId || form.customerName ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{form.customerName}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[form.email, form.phone].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
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
          </div>

          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Customer vehicle
              </span>
              <select
                className={inputClass}
                value={form.customerVehicleId}
                onChange={(e) => setForm({ ...form, customerVehicleId: e.target.value })}
                required
                disabled={!form.customerId}
              >
                <option value="">{form.customerId ? "Select vehicle" : "Select a customer first"}</option>
                {customerVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {formatCustomerVehicleOption(vehicle)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={btnSecondary}
              disabled={!form.customerVehicleId}
              onClick={() => setVehicleDetailId(form.customerVehicleId || null)}
            >
              Vehicle file
            </button>
          </div>

          <label className="block text-sm text-slate-300 sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Assigned technician
            </span>
            <select
              className={inputClass}
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              required
            >
              <option value="">Select technician</option>
              {activeStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <input
            className={inputClass}
            placeholder="Customer name"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value, customerId: "", customerVehicleId: "" })}
            required
          />
          <input
            className={inputClass}
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="block text-sm text-slate-300 sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Service catalog
            </span>
            <select
              className={inputClass}
              value={form.serviceId}
              onChange={(e) => applyCatalogService(e.target.value)}
            >
              <option value="">Custom / free-text service</option>
              {SHOP_SERVICE_CATEGORIES.map((category) => {
                const options = activeServices.filter((item) => item.category === category);
                if (!options.length) return null;
                return (
                  <optgroup key={category} label={category}>
                    {options.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.startingPrice > 0 ? ` · from $${item.startingPrice.toFixed(0)}` : ""}
                        {` · ${item.estimatedDurationMinutes}m`}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </label>
          <input
            className={inputClass}
            placeholder="Service name"
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value, serviceId: "" })}
            required
          />
          <input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inputClass} type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <select
            className={inputClass}
            value={form.locationType}
            onChange={(e) => setForm({ ...form, locationType: e.target.value as BookingLocationType | "" })}
          >
            <option value="">Location type</option>
            {LOCATION_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            type="number"
            min={15}
            step={15}
            placeholder="Duration (minutes)"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          />
          <input className={`${inputClass} sm:col-span-2`} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input
            className={inputClass}
            placeholder="Gate / entry code"
            value={form.gateCode}
            onChange={(e) => setForm({ ...form, gateCode: e.target.value })}
          />
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input
              className={inputClass}
              placeholder="Lat"
              value={form.lat}
              onChange={(e) => {
                const value = e.target.value;
                const pasted = parseCoordsFromText(value);
                if (pasted) applyCoords(pasted.lat, pasted.lng, "Coordinates pasted.");
                else setForm({ ...form, lat: value });
              }}
            />
            <input
              className={inputClass}
              placeholder="Lng"
              value={form.lng}
              onChange={(e) => {
                const value = e.target.value;
                const pasted = parseCoordsFromText(value);
                if (pasted) applyCoords(pasted.lat, pasted.lng, "Coordinates pasted.");
                else setForm({ ...form, lng: value });
              }}
            />
            <button type="button" className={btnPrimary} onClick={pinFromAddress} disabled={pinning} title="Geocode the job address">
              <MapPin className="h-3.5 w-3.5" />
              {pinning ? "…" : "Pin address"}
            </button>
            <button type="button" className={btnSecondary} onClick={captureMyLocation} disabled={pinning} title="Use this device’s current location">
              {pinning ? "…" : "My location"}
            </button>
          </div>
          <p className="sm:col-span-2 text-xs text-slate-500">
            Use <span className="text-slate-300">Pin address</span> for the job site (recommended). Device GPS often times out on
            desktops.
          </p>
          <textarea
            className={`${inputClass} sm:col-span-2`}
            placeholder="Access notes (parking, pets, building entry…)"
            value={form.accessNotes}
            onChange={(e) => setForm({ ...form, accessNotes: e.target.value })}
          />
          <textarea
            className={`${inputClass} sm:col-span-2`}
            placeholder="Problem description"
            value={form.problemDescription}
            onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
          />
          <textarea className={`${inputClass} sm:col-span-2`} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Site photos
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:text-slate-200"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                setPendingPhotos((prev) => [...prev, ...files].slice(0, 8));
                e.target.value = "";
              }}
            />
            {pendingPhotos.length ? (
              <ul className="space-y-1 text-xs text-slate-400">
                {pendingPhotos.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      className="text-rose-300 hover:text-rose-200"
                      onClick={() => setPendingPhotos((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Optional — up to 8 photos (5 MB each).</p>
            )}
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? "Saving…" : "Create booking"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      </AdminModal>

      <CustomerPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleCustomerSelect} stacked />

      <CustomerVehicleDetailModal
        open={Boolean(vehicleDetailId)}
        customerVehicleId={vehicleDetailId}
        stacked
        onClose={() => setVehicleDetailId(null)}
        onUpdated={(updated) => {
          setCustomerVehicles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }}
      />

      <AdminModal
        open={showServices}
        onClose={() => {
          setShowServices(false);
          setServiceForm(emptyServiceForm);
        }}
        title="Service catalog"
        wide
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={saveService} className="space-y-3">
            <p className="text-sm text-slate-400">
              {serviceForm.id ? "Editing service" : "Add a service"} — used by bookings and work orders.
            </p>
            <input
              className={inputClass}
              placeholder="Service name"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              required
            />
            <select
              className={inputClass}
              value={serviceForm.category}
              onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
            >
              {SHOP_SERVICE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Description"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                className={inputClass}
                type="number"
                min={15}
                step={15}
                placeholder="Minutes"
                value={serviceForm.estimatedDurationMinutes}
                onChange={(e) => setServiceForm({ ...serviceForm, estimatedDurationMinutes: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min={0}
                step={0.25}
                placeholder="Labor hrs"
                value={serviceForm.laborHours}
                onChange={(e) => setServiceForm({ ...serviceForm, laborHours: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min={0}
                step={1}
                placeholder="From $"
                value={serviceForm.startingPrice}
                onChange={(e) => setServiceForm({ ...serviceForm, startingPrice: e.target.value })}
              />
            </div>
            <input
              className={inputClass}
              placeholder="Warranty note"
              value={serviceForm.warranty}
              onChange={(e) => setServiceForm({ ...serviceForm, warranty: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={serviceForm.active}
                onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })}
              />
              Active in booking/work-order pickers
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={btnPrimary} disabled={savingService}>
                {savingService ? "Saving…" : serviceForm.id ? "Update service" : "Add service"}
              </button>
              {serviceForm.id ? (
                <button type="button" className={btnSecondary} onClick={() => setServiceForm(emptyServiceForm)}>
                  New service
                </button>
              ) : null}
            </div>
          </form>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {!services.length ? (
              <p className="text-sm text-slate-500">
                No catalog yet. Run <code className="text-slate-400">supabase/add-shop-services.sql</code>, or add
                services here.
              </p>
            ) : (
              services.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5"
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => editService(item)}>
                    <p className="truncate text-sm font-medium text-white">
                      {item.name}
                      {!item.active ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500">Inactive</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.category} · {item.estimatedDurationMinutes}m
                      {item.startingPrice > 0 ? ` · from $${item.startingPrice.toFixed(0)}` : ""}
                    </p>
                  </button>
                  <button type="button" className={btnDanger} onClick={() => removeService(item.id)} aria-label="Delete service">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </AdminModal>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !items.length ? (
        <EmptyState
          icon={Calendar}
          title="No bookings yet"
          text="Website contact requests and manually scheduled appointments will appear here from Supabase."
        />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <article key={b.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{b.customerName}</h3>
                    <StatusBadge status={b.status} />
                    {b.depositPaid ? <StatusBadge status="deposit_paid" /> : null}
                    {b.quoteId ? (
                      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30">
                        Website
                      </span>
                    ) : null}
                    {b.customerId ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/20">
                        Customer linked
                      </span>
                    ) : null}
                    {b.workOrderId ? (
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-200 ring-1 ring-indigo-400/30">
                        WO linked
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{b.service}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(b.date).toLocaleDateString()} at {b.time}
                    {b.locationType ? ` · ${b.locationType}` : ""}
                    {b.address ? ` · ${b.address}` : ""}
                    {b.phone ? ` · ${b.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tech: {staffName(b.assignedTo)}
                    {b.customerVehicleId ? " · Vehicle on file" : " · No vehicle linked"}
                    {b.durationMinutes ? ` · ${b.durationMinutes} min` : ""}
                  </p>
                  {b.customerVehicleId ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-sky-300 hover:text-sky-200"
                      onClick={() => setVehicleDetailId(b.customerVehicleId!)}
                    >
                      Open vehicle file (glovebox / history)
                    </button>
                  ) : null}
                  {b.gateCode || b.accessNotes || (b.lat != null && b.lng != null) ? (
                    <p className="mt-1 text-xs text-slate-400">
                      {b.gateCode ? `Gate: ${b.gateCode}` : null}
                      {b.gateCode && (b.accessNotes || (b.lat != null && b.lng != null)) ? " · " : null}
                      {b.accessNotes ? b.accessNotes : null}
                      {b.accessNotes && b.lat != null && b.lng != null ? " · " : null}
                      {b.lat != null && b.lng != null ? (
                        <a
                          href={`https://maps.google.com/?q=${b.lat},${b.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
                        >
                          <MapPin className="h-3 w-3" />
                          GPS pin
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                  {b.problemDescription ? <p className="mt-2 text-sm text-slate-400">{b.problemDescription}</p> : null}
                  {b.notes ? <p className="mt-2 text-sm text-slate-500">{b.notes}</p> : null}
                  {b.photoUrls?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {b.photoUrls.map((url) => (
                        <div key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Site photo" className="h-full w-full object-cover" />
                          <Can permission="bookings.edit">
                            <button
                              type="button"
                              className="absolute inset-0 hidden items-center justify-center bg-black/60 text-[10px] text-white group-hover:flex"
                              onClick={() => removePhoto(b.id, url)}
                            >
                              Remove
                            </button>
                          </Can>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <Can permission="bookings.edit">
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
                      Add site photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void addPhotoToBooking(b.id, file);
                        }}
                      />
                    </label>
                  </Can>
                  {b.workOrderId ? (
                    <a
                      href="#work-orders"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Work order {formatOrderNumber(b.workOrderId)} — open Work Orders
                    </a>
                  ) : null}
                  {!b.workOrderId && b.status === "pending" ? (
                    <p className="mt-2 text-xs text-amber-300/90">
                      Confirm to create the work order and add a stop on the technician&apos;s route.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Can permission="bookings.edit">
                    {b.status === "pending" && (
                      <>
                        <button type="button" onClick={() => setStatus(b.id, "confirmed")} className={btnPrimary}>Confirm</button>
                        <button type="button" onClick={() => setStatus(b.id, "cancelled")} className={btnSecondary}>Cancel</button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <>
                        <button type="button" onClick={() => setStatus(b.id, "completed")} className={btnSecondary}>Complete</button>
                        <button type="button" onClick={() => setStatus(b.id, "cancelled")} className={btnSecondary}>Cancel</button>
                      </>
                    )}
                  </Can>
                  <Can permission="bookings.delete">
                    <button type="button" onClick={() => remove(b.id)} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /></button>
                  </Can>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
