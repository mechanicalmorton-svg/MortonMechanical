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
  DashboardStats,
  FleetVehicle,
  InventoryItem,
  RoutePlan,
  StaffMember,
  WorkOrder,
} from "./shop-types";

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
    customerName: r.customer_name as string,
    phone: (r.phone as string) ?? "",
    vehicle: (r.vehicle as string) ?? "",
    service: r.service as string,
    status: r.status as WorkOrder["status"],
    priority: r.priority as WorkOrder["priority"],
    assignedTo: r.assigned_to as string | undefined,
    notes: r.notes as string | undefined,
    revenue: r.revenue != null ? Number(r.revenue) : undefined,
    scheduledDate: r.scheduled_date as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function workOrderToRow(w: WorkOrder) {
  return {
    id: w.id,
    customer_name: w.customerName,
    phone: w.phone,
    vehicle: w.vehicle,
    service: w.service,
    status: w.status,
    priority: w.priority,
    assigned_to: w.assignedTo,
    notes: w.notes,
    revenue: w.revenue,
    scheduled_date: w.scheduledDate,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
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
    supplier: r.supplier as string | undefined,
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
    supplier: i.supplier,
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
