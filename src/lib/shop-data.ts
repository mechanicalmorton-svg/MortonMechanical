import { readJson, writeJson, newId } from "./store";
import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";
import {
  createPortalUser,
  deletePortalUser,
  loadStaffFromAuth,
  updatePortalUser,
} from "./staff-auth";
import type {
  Booking,
  Customer,
  CustomerVehicle,
  DashboardStats,
  FleetVehicle,
  InventoryItem,
  RoutePlan,
  StaffMember,
  WorkOrder,
} from "./shop-types";
import { formatCustomerVehicleLabel } from "./customer-vehicles";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

// --- mappers ---

function rowToWorkOrder(r: Record<string, unknown>): WorkOrder {
  return {
    id: r.id as string,
    customerId: (r.customer_id as string) || undefined,
    customerVehicleId: (r.customer_vehicle_id as string) || undefined,
    customerName: r.customer_name as string,
    phone: (r.phone as string) ?? "",
    vehicle: (r.vehicle as string) ?? "",
    customerConcern: (r.customer_concern as string) || undefined,
    service: r.service as string,
    status: r.status as WorkOrder["status"],
    priority: r.priority as WorkOrder["priority"],
    assignedTo: r.assigned_to as string | undefined,
    notes: r.notes as string | undefined,
    internalNotes: (r.internal_notes as string) || undefined,
    revenue: r.revenue != null ? Number(r.revenue) : undefined,
    scheduledDate: r.scheduled_date as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function workOrderToRow(w: WorkOrder) {
  return {
    id: w.id,
    customer_id: w.customerId?.trim() || null,
    customer_vehicle_id: w.customerVehicleId?.trim() || null,
    customer_name: w.customerName,
    phone: w.phone,
    vehicle: w.vehicle,
    customer_concern: w.customerConcern ?? "",
    service: w.service,
    status: w.status,
    priority: w.priority,
    assigned_to: w.assignedTo,
    notes: w.notes,
    internal_notes: w.internalNotes ?? "",
    revenue: w.revenue,
    scheduled_date: w.scheduledDate,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  };
}

function rowToCustomer(r: Record<string, unknown>): Customer {
  return {
    id: r.id as string,
    name: r.name as string,
    phone: (r.phone as string) ?? "",
    email: (r.email as string) || undefined,
    address: (r.address as string) || undefined,
    notes: (r.notes as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function customerToRow(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function rowToCustomerVehicle(r: Record<string, unknown>): CustomerVehicle {
  return {
    id: r.id as string,
    customerId: r.customer_id as string,
    vehicleConfigurationId: r.vehicle_configuration_id != null ? Number(r.vehicle_configuration_id) : undefined,
    year: r.year != null ? Number(r.year) : undefined,
    make: (r.make as string) || undefined,
    model: (r.model as string) || undefined,
    trim: (r.trim as string) || undefined,
    vin: (r.vin as string) || undefined,
    plate: (r.plate as string) || undefined,
    powertrain: (r.powertrain as string) || undefined,
    mileage: r.mileage != null ? Number(r.mileage) : undefined,
    color: (r.color as string) || undefined,
    notes: (r.notes as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function customerVehicleToRow(v: CustomerVehicle) {
  return {
    id: v.id,
    customer_id: v.customerId,
    vehicle_configuration_id: v.vehicleConfigurationId ?? null,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    vin: v.vin,
    plate: v.plate,
    powertrain: v.powertrain,
    mileage: v.mileage,
    color: v.color,
    notes: v.notes,
    created_at: v.createdAt,
  };
}

function rowToBooking(r: Record<string, unknown>): Booking {
  return {
    id: r.id as string,
    customerName: r.customer_name as string,
    phone: r.phone as string,
    email: r.email as string | undefined,
    service: r.service as string,
    date: r.date as string,
    time: r.time as string,
    address: r.address as string | undefined,
    status: r.status as Booking["status"],
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
  };
}

function bookingToRow(b: Booking) {
  return {
    id: b.id,
    customer_name: b.customerName,
    phone: b.phone,
    email: b.email,
    service: b.service,
    date: b.date,
    time: b.time,
    address: b.address,
    status: b.status,
    notes: b.notes,
    created_at: b.createdAt,
  };
}

function rowToInventory(r: Record<string, unknown>): InventoryItem {
  return {
    id: r.id as string,
    name: r.name as string,
    partNumber: (r.part_number as string) ?? "",
    sku: (r.sku as string) ?? "",
    category: (r.category as string) ?? "General",
    quantity: Number(r.quantity),
    minStock: Number(r.min_stock),
    unitCost: Number(r.unit_cost),
    sellPrice: Number(r.sell_price ?? 0),
    supplier: r.supplier as string | undefined,
    supplierLink: (r.supplier_link as string) || undefined,
    vehicleId: (r.vehicle_id as string) || undefined,
    location: r.location as string | undefined,
    updatedAt: r.updated_at as string,
  };
}

function inventoryToRow(i: InventoryItem) {
  return {
    id: i.id,
    name: i.name,
    part_number: i.partNumber,
    sku: i.sku,
    category: i.category,
    quantity: i.quantity,
    min_stock: i.minStock,
    unit_cost: i.unitCost,
    sell_price: i.sellPrice,
    supplier: i.supplier,
    supplier_link: i.supplierLink ?? "",
    vehicle_id: i.vehicleId ?? "",
    location: i.location,
    updated_at: i.updatedAt,
  };
}

function rowToFleet(r: Record<string, unknown>): FleetVehicle {
  return {
    id: r.id as string,
    name: r.name as string,
    plate: r.plate as string,
    type: (r.type as string) ?? "Service Van",
    make: r.make as string | undefined,
    model: r.model as string | undefined,
    year: r.year != null ? Number(r.year) : undefined,
    status: r.status as FleetVehicle["status"],
    mileage: r.mileage != null ? Number(r.mileage) : undefined,
    lastService: r.last_service as string | undefined,
  };
}

function fleetToRow(v: FleetVehicle) {
  return {
    id: v.id,
    name: v.name,
    plate: v.plate,
    type: v.type,
    make: v.make,
    model: v.model,
    year: v.year,
    status: v.status,
    mileage: v.mileage,
    last_service: v.lastService,
  };
}

function rowToRoute(r: Record<string, unknown>): RoutePlan {
  return {
    id: r.id as string,
    date: r.date as string,
    driverId: r.driver_id as string | undefined,
    vehicleId: r.vehicle_id as string | undefined,
    stops: (r.stops as RoutePlan["stops"]) ?? [],
    status: r.status as RoutePlan["status"],
    notes: r.notes as string | undefined,
  };
}

function routeToRow(r: RoutePlan) {
  return {
    id: r.id,
    date: r.date,
    driver_id: r.driverId,
    vehicle_id: r.vehicleId,
    stops: r.stops,
    status: r.status,
    notes: r.notes,
  };
}

// --- load / save ---

export async function loadWorkOrders(): Promise<WorkOrder[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("work_orders")
      .select("*")
      .order("updated_at", { ascending: false });
    throwOnError(error, "Could not load work orders");
    return (data ?? []).map(rowToWorkOrder);
  }
  return readJson("work-orders.json", []);
}

export async function upsertWorkOrder(item: WorkOrder) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("work_orders").upsert(workOrderToRow(item));
    throwOnError(error, "Could not save work order");
    return;
  }
  const items = await loadWorkOrders();
  const idx = items.findIndex((w) => w.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("work-orders.json", items);
}

export async function deleteWorkOrder(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("work_orders").delete().eq("id", id);
    throwOnError(error, "Could not delete work order");
    return;
  }
  writeJson("work-orders.json", (await loadWorkOrders()).filter((w) => w.id !== id));
}

export async function loadCustomers(query?: string): Promise<Customer[]> {
  if (useDatabase()) {
    let request = requireAdminClient().from("customers").select("*").order("name");
    const { data, error } = await request;
    throwOnError(error, "Could not load customers");
    let customers = (data ?? []).map(rowToCustomer);
    const q = query?.trim().toLowerCase();
    if (q) {
      customers = customers.filter((customer) =>
        [customer.name, customer.phone, customer.email ?? "", customer.address ?? ""].join(" ").toLowerCase().includes(q),
      );
    }
    return customers;
  }
  const q = query?.trim().toLowerCase();
  const customers = readJson<Customer[]>("customers.json", []);
  if (!q) return customers.sort((a, b) => a.name.localeCompare(b.name));
  return customers
    .filter((customer) =>
      [customer.name, customer.phone, customer.email ?? "", customer.address ?? ""].join(" ").toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertCustomer(item: Customer) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customers").upsert(customerToRow(item));
    throwOnError(error, "Could not save customer");
    return;
  }
  const items = await loadCustomers();
  const idx = items.findIndex((c) => c.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("customers.json", items);
}

export async function deleteCustomer(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customers").delete().eq("id", id);
    throwOnError(error, "Could not delete customer");
    return;
  }
  writeJson("customers.json", (await loadCustomers()).filter((c) => c.id !== id));
  writeJson(
    "customer-vehicles.json",
    (await loadCustomerVehicles()).filter((v) => v.customerId !== id),
  );
}

export async function loadCustomerVehicles(customerId?: string): Promise<CustomerVehicle[]> {
  if (useDatabase()) {
    let request = requireAdminClient().from("customer_vehicles").select("*").order("created_at", { ascending: false });
    if (customerId) request = request.eq("customer_id", customerId);
    const { data, error } = await request;
    throwOnError(error, "Could not load customer vehicles");
    return (data ?? []).map(rowToCustomerVehicle);
  }
  const vehicles = readJson<CustomerVehicle[]>("customer-vehicles.json", []);
  const filtered = customerId ? vehicles.filter((v) => v.customerId === customerId) : vehicles;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertCustomerVehicle(item: CustomerVehicle) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customer_vehicles").upsert(customerVehicleToRow(item));
    throwOnError(error, "Could not save customer vehicle");
    return;
  }
  const items = await loadCustomerVehicles();
  const idx = items.findIndex((v) => v.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("customer-vehicles.json", items);
}

export async function deleteCustomerVehicle(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customer_vehicles").delete().eq("id", id);
    throwOnError(error, "Could not delete customer vehicle");
    return;
  }
  writeJson("customer-vehicles.json", (await loadCustomerVehicles()).filter((v) => v.id !== id));
}

export async function getCustomerById(id: string) {
  const customers = await loadCustomers();
  return customers.find((customer) => customer.id === id) ?? null;
}

export async function getCustomerVehicleById(id: string) {
  const vehicles = await loadCustomerVehicles();
  return vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

type WorkOrderVehicleInput = {
  id?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  vin?: string;
  plate?: string;
  powertrain?: string;
  notes?: string;
};

export async function resolveWorkOrderLinks(input: {
  customerId?: string;
  customerVehicleId?: string;
  customerName?: string;
  phone?: string;
  vehicle?: WorkOrderVehicleInput;
  saveVehicleToFile?: boolean;
}) {
  let customer: Customer | null = null;
  if (input.customerId) {
    customer = await getCustomerById(input.customerId);
    if (!customer) throw new Error("Selected customer was not found.");
  }

  let vehicle: CustomerVehicle | null = null;
  if (input.customerVehicleId) {
    vehicle = await getCustomerVehicleById(input.customerVehicleId);
    if (!vehicle) throw new Error("Selected vehicle was not found.");
    if (customer && vehicle.customerId !== customer.id) throw new Error("Vehicle does not belong to this customer.");
    if (!customer) customer = await getCustomerById(vehicle.customerId);
  } else if (customer && input.vehicle && hasVehicleDetails(input.vehicle) && input.saveVehicleToFile !== false) {
    const now = new Date().toISOString();
    if (input.vehicle.id) {
      const existing = await getCustomerVehicleById(input.vehicle.id);
      if (existing && existing.customerId === customer.id) {
        vehicle = {
          ...existing,
          year: input.vehicle.year ?? existing.year,
          make: input.vehicle.make ?? existing.make,
          model: input.vehicle.model ?? existing.model,
          trim: input.vehicle.trim ?? existing.trim,
          vin: input.vehicle.vin ?? existing.vin,
          plate: input.vehicle.plate ?? existing.plate,
          powertrain: input.vehicle.powertrain ?? existing.powertrain,
          notes: input.vehicle.notes ?? existing.notes,
        };
        await upsertCustomerVehicle(vehicle);
      }
    }
    if (!vehicle) {
      vehicle = {
        id: createId(),
        customerId: customer.id,
        year: input.vehicle.year,
        make: input.vehicle.make,
        model: input.vehicle.model,
        trim: input.vehicle.trim,
        vin: input.vehicle.vin,
        plate: input.vehicle.plate,
        powertrain: input.vehicle.powertrain,
        notes: input.vehicle.notes,
        createdAt: now,
      };
      await upsertCustomerVehicle(vehicle);
    }
  }

  const customerName = customer?.name ?? input.customerName?.trim() ?? "Unknown";
  const phone = customer?.phone ?? input.phone ?? "";
  const vehicleLabel = vehicle ? formatCustomerVehicleLabel(vehicle) : input.vehicle ? formatCustomerVehicleLabel(input.vehicle) : "";

  return {
    customerId: customer?.id,
    customerVehicleId: vehicle?.id,
    customerName,
    phone,
    vehicle: vehicleLabel,
  };
}

function hasVehicleDetails(vehicle: WorkOrderVehicleInput) {
  return Boolean(
    vehicle.year ||
      vehicle.make?.trim() ||
      vehicle.model?.trim() ||
      vehicle.trim?.trim() ||
      vehicle.vin?.trim() ||
      vehicle.plate?.trim() ||
      vehicle.powertrain?.trim(),
  );
}

export async function loadBookings(): Promise<Booking[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    throwOnError(error, "Could not load bookings");
    return (data ?? []).map(rowToBooking);
  }
  return readJson("bookings.json", []);
}

export async function upsertBooking(item: Booking) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("bookings").upsert(bookingToRow(item));
    throwOnError(error, "Could not save booking");
    return;
  }
  const items = await loadBookings();
  const idx = items.findIndex((b) => b.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("bookings.json", items);
}

export async function deleteBooking(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("bookings").delete().eq("id", id);
    throwOnError(error, "Could not delete booking");
    return;
  }
  writeJson("bookings.json", (await loadBookings()).filter((b) => b.id !== id));
}

export async function loadInventory(): Promise<InventoryItem[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient().from("inventory").select("*").order("name");
    throwOnError(error, "Could not load inventory");
    return (data ?? []).map(rowToInventory);
  }
  return readJson<InventoryItem[]>("inventory.json", []).map((item) => ({
    ...item,
    partNumber: item.partNumber ?? "",
    sellPrice: item.sellPrice ?? 0,
    supplierLink: item.supplierLink ?? undefined,
    vehicleId: item.vehicleId ?? undefined,
  }));
}

export async function upsertInventoryItem(item: InventoryItem) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("inventory").upsert(inventoryToRow(item));
    throwOnError(error, "Could not save inventory item");
    return;
  }
  const items = await loadInventory();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("inventory.json", items);
}

export async function deleteInventoryItem(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("inventory").delete().eq("id", id);
    throwOnError(error, "Could not delete inventory item");
    return;
  }
  writeJson("inventory.json", (await loadInventory()).filter((i) => i.id !== id));
}

export async function loadStaff(): Promise<StaffMember[]> {
  if (useDatabase()) return loadStaffFromAuth();
  return readJson<StaffMember[]>("staff.json", []);
}

export async function upsertStaffMember(item: StaffMember) {
  if (useDatabase()) {
    return updatePortalUser(item.id, {
      name: item.name,
      phone: item.phone,
      role: item.role,
      active: item.active,
    });
  }
  const items = await loadStaff();
  const idx = items.findIndex((s) => s.id === item.id);
  const saved = idx >= 0 ? { ...items[idx], ...item } : item;
  if (idx >= 0) items[idx] = saved;
  else items.push(saved);
  writeJson("staff.json", items);
  return saved;
}

export async function deleteStaffMember(id: string) {
  if (useDatabase()) {
    await deletePortalUser(id);
    return;
  }
  writeJson("staff.json", (await loadStaff()).filter((s) => s.id !== id));
}

export { createPortalUser };

export async function loadFleet(): Promise<FleetVehicle[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient().from("fleet").select("*").order("name");
    throwOnError(error, "Could not load fleet");
    return (data ?? []).map(rowToFleet);
  }
  return readJson<FleetVehicle[]>("fleet.json", []);
}

export async function upsertFleetVehicle(item: FleetVehicle) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("fleet").upsert(fleetToRow(item));
    throwOnError(error, "Could not save fleet vehicle");
    return;
  }
  const items = await loadFleet();
  const idx = items.findIndex((v) => v.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("fleet.json", items);
}

export async function deleteFleetVehicle(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("fleet").delete().eq("id", id);
    throwOnError(error, "Could not delete fleet vehicle");
    return;
  }
  writeJson("fleet.json", (await loadFleet()).filter((v) => v.id !== id));
}

export async function loadRoutes(): Promise<RoutePlan[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("routes")
      .select("*")
      .order("date", { ascending: false });
    throwOnError(error, "Could not load routes");
    return (data ?? []).map(rowToRoute);
  }
  return readJson("routes.json", []);
}

export async function upsertRoute(item: RoutePlan) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("routes").upsert(routeToRow(item));
    throwOnError(error, "Could not save route");
    return;
  }
  const items = await loadRoutes();
  const idx = items.findIndex((r) => r.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("routes.json", items);
}

export async function deleteRoute(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("routes").delete().eq("id", id);
    throwOnError(error, "Could not delete route");
    return;
  }
  writeJson("routes.json", (await loadRoutes()).filter((r) => r.id !== id));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const workOrders = await loadWorkOrders();
  const bookings = await loadBookings();
  const inventory = await loadInventory();
  const fleet = await loadFleet();
  const t = today();
  const ms = monthStart();

  return {
    openWorkOrders: workOrders.filter((w) => w.status === "open").length,
    inProgressWorkOrders: workOrders.filter((w) => w.status === "in_progress").length,
    todayBookings: bookings.filter((b) => b.date === t && b.status !== "cancelled").length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    urgentItems:
      workOrders.filter((w) => w.priority === "urgent" && w.status !== "completed" && w.status !== "cancelled").length +
      inventory.filter((i) => i.quantity <= i.minStock).length,
    mtdRevenue: workOrders
      .filter((w) => w.status === "completed" && w.updatedAt >= ms)
      .reduce((sum, w) => sum + (w.revenue ?? 0), 0),
    lowStockCount: inventory.filter((i) => i.quantity <= i.minStock).length,
    activeFleet: fleet.filter((f) => f.status === "active").length,
  };
}

export function createId() {
  return newId();
}
