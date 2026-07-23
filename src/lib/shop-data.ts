import { readJson, writeJson, newId } from "./store";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase/server";
import type {
  Booking,
  DashboardStats,
  FleetVehicle,
  InventoryItem,
  RoutePlan,
  StaffMember,
  WorkOrder,
} from "./shop-types";
import { DEFAULT_FLEET, DEFAULT_INVENTORY, DEFAULT_STAFF } from "./shop-types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
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
    sku: (r.sku as string) ?? "",
    category: (r.category as string) ?? "General",
    quantity: Number(r.quantity),
    minStock: Number(r.min_stock),
    unitCost: Number(r.unit_cost),
    supplier: r.supplier as string | undefined,
    location: r.location as string | undefined,
    updatedAt: r.updated_at as string,
  };
}

function inventoryToRow(i: InventoryItem) {
  return {
    id: i.id,
    name: i.name,
    sku: i.sku,
    category: i.category,
    quantity: i.quantity,
    min_stock: i.minStock,
    unit_cost: i.unitCost,
    supplier: i.supplier,
    location: i.location,
    updated_at: i.updatedAt,
  };
}

function rowToStaff(r: Record<string, unknown>): StaffMember {
  return {
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string) ?? "",
    role: r.role as StaffMember["role"],
    active: Boolean(r.active),
    createdAt: r.created_at as string,
  };
}

function staffToRow(s: StaffMember) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    active: s.active,
    created_at: s.createdAt,
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
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("work_orders").select("*").order("updated_at", { ascending: false });
    return (data ?? []).map(rowToWorkOrder);
  }
  return readJson("work-orders.json", []);
}

export async function saveWorkOrders(items: WorkOrder[]) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    await sb.from("work_orders").delete().neq("id", "");
    if (items.length) await sb.from("work_orders").upsert(items.map(workOrderToRow));
    return;
  }
  writeJson("work-orders.json", items);
}

export async function upsertWorkOrder(item: WorkOrder) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("work_orders").upsert(workOrderToRow(item));
    return;
  }
  const items = await loadWorkOrders();
  const idx = items.findIndex((w) => w.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("work-orders.json", items);
}

export async function deleteWorkOrder(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("work_orders").delete().eq("id", id);
    return;
  }
  writeJson("work-orders.json", (await loadWorkOrders()).filter((w) => w.id !== id));
}

export async function loadBookings(): Promise<Booking[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("bookings").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(rowToBooking);
  }
  return readJson("bookings.json", []);
}

export async function upsertBooking(item: Booking) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("bookings").upsert(bookingToRow(item));
    return;
  }
  const items = await loadBookings();
  const idx = items.findIndex((b) => b.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("bookings.json", items);
}

export async function deleteBooking(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("bookings").delete().eq("id", id);
    return;
  }
  writeJson("bookings.json", (await loadBookings()).filter((b) => b.id !== id));
}

export async function loadInventory(): Promise<InventoryItem[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("inventory").select("*").order("name");
    const items = (data ?? []).map(rowToInventory);
    return items.length ? items : DEFAULT_INVENTORY;
  }
  const items = readJson<InventoryItem[]>("inventory.json", []);
  return items.length ? items : DEFAULT_INVENTORY;
}

export async function upsertInventoryItem(item: InventoryItem) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("inventory").upsert(inventoryToRow(item));
    return;
  }
  const items = await loadInventory();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("inventory.json", items);
}

export async function deleteInventoryItem(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("inventory").delete().eq("id", id);
    return;
  }
  writeJson("inventory.json", (await loadInventory()).filter((i) => i.id !== id));
}

export async function loadStaff(): Promise<StaffMember[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("staff").select("*").order("name");
    const items = (data ?? []).map(rowToStaff);
    return items.length ? items : DEFAULT_STAFF;
  }
  const items = readJson<StaffMember[]>("staff.json", []);
  return items.length ? items : DEFAULT_STAFF;
}

export async function upsertStaffMember(item: StaffMember) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("staff").upsert(staffToRow(item));
    return;
  }
  const items = await loadStaff();
  const idx = items.findIndex((s) => s.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("staff.json", items);
}

export async function deleteStaffMember(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("staff").delete().eq("id", id);
    return;
  }
  writeJson("staff.json", (await loadStaff()).filter((s) => s.id !== id));
}

export async function loadFleet(): Promise<FleetVehicle[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("fleet").select("*").order("name");
    const items = (data ?? []).map(rowToFleet);
    return items.length ? items : DEFAULT_FLEET;
  }
  const items = readJson<FleetVehicle[]>("fleet.json", []);
  return items.length ? items : DEFAULT_FLEET;
}

export async function upsertFleetVehicle(item: FleetVehicle) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("fleet").upsert(fleetToRow(item));
    return;
  }
  const items = await loadFleet();
  const idx = items.findIndex((v) => v.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  writeJson("fleet.json", items);
}

export async function deleteFleetVehicle(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("fleet").delete().eq("id", id);
    return;
  }
  writeJson("fleet.json", (await loadFleet()).filter((v) => v.id !== id));
}

export async function loadRoutes(): Promise<RoutePlan[]> {
  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()!.from("routes").select("*").order("date", { ascending: false });
    return (data ?? []).map(rowToRoute);
  }
  return readJson("routes.json", []);
}

export async function upsertRoute(item: RoutePlan) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("routes").upsert(routeToRow(item));
    return;
  }
  const items = await loadRoutes();
  const idx = items.findIndex((r) => r.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  writeJson("routes.json", items);
}

export async function deleteRoute(id: string) {
  if (isSupabaseConfigured()) {
    await getSupabaseAdmin()!.from("routes").delete().eq("id", id);
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
