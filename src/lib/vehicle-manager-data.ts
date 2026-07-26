import { readJson, writeJson, newId } from "./store";
import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";
import { auditDelete, auditUpsert } from "./audit-instrument";
import type {
  VmActivity,
  VmChecklist,
  VmChecklistItem,
  VmPart,
  VmServiceOrder,
  VmServiceOrderPart,
  VmVehicle,
} from "./shop-types";

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

async function fetchDbRowById<T>(
  table: string,
  id: string,
  map: (row: Record<string, unknown>) => T,
): Promise<T | null> {
  if (!id || !useDatabase()) return null;
  try {
    const { data, error } = await requireAdminClient().from(table).select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return map(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

function rowToVmVehicle(r: Record<string, unknown>): VmVehicle {
  return {
    id: r.id as string,
    vehicleNumber: (r.vehicle_number as string) ?? "",
    year: Number(r.year) || 0,
    make: (r.make as string) ?? "",
    model: (r.model as string) ?? "",
  };
}

function vmVehicleToRow(v: VmVehicle) {
  return {
    id: v.id,
    vehicle_number: v.vehicleNumber,
    year: v.year,
    make: v.make,
    model: v.model,
  };
}

function rowToVmPart(r: Record<string, unknown>): VmPart {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    partNumber: (r.part_number as string) ?? "",
    description: (r.description as string) ?? "",
  };
}

function vmPartToRow(p: VmPart) {
  return {
    id: p.id,
    name: p.name,
    part_number: p.partNumber,
    description: p.description,
  };
}

function rowToVmActivity(r: Record<string, unknown>): VmActivity {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
  };
}

function vmActivityToRow(a: VmActivity) {
  return { id: a.id, name: a.name };
}

function rowToVmServiceOrder(r: Record<string, unknown>): VmServiceOrder {
  const parts = Array.isArray(r.parts) ? (r.parts as VmServiceOrderPart[]) : [];
  return {
    id: r.id as string,
    vehicleId: r.vehicle_id as string,
    mileage: (r.mileage as string) ?? "",
    workNeeded: (r.work_needed as string) ?? "",
    dvir: (r.dvir as string) ?? "",
    description: (r.description as string) ?? "",
    hours: Number(r.hours) || 0,
    activityId: (r.activity_id as string) || undefined,
    parts,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function vmServiceOrderToRow(o: VmServiceOrder) {
  return {
    id: o.id,
    vehicle_id: o.vehicleId,
    mileage: o.mileage,
    work_needed: o.workNeeded,
    dvir: o.dvir,
    description: o.description,
    hours: o.hours,
    activity_id: o.activityId ?? null,
    parts: o.parts,
    created_at: o.createdAt,
  };
}

function rowToVmChecklist(r: Record<string, unknown>): VmChecklist {
  const items = Array.isArray(r.items) ? (r.items as VmChecklistItem[]) : [];
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    items,
  };
}

function vmChecklistToRow(c: VmChecklist) {
  return {
    id: c.id,
    name: c.name,
    created_at: c.createdAt,
    items: c.items,
  };
}

export function createVmId() {
  return newId();
}

// —— Vehicles ——

export async function loadVmVehicles(): Promise<VmVehicle[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("vm_vehicles")
      .select("*")
      .order("model")
      .order("vehicle_number");
    throwOnError(error, "Could not load vehicles");
    return (data ?? []).map(rowToVmVehicle);
  }
  return readJson<VmVehicle[]>("vm-vehicles.json", []);
}

export async function upsertVmVehicle(item: VmVehicle) {
  const before =
    (await fetchDbRowById("vm_vehicles", item.id, rowToVmVehicle)) ??
    (await loadVmVehicles()).find((v) => v.id === item.id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_vehicles").upsert(vmVehicleToRow(item));
    throwOnError(error, "Could not save vehicle");
  } else {
    const items = await loadVmVehicles();
    const idx = items.findIndex((v) => v.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    writeJson("vm-vehicles.json", items);
  }
  void auditUpsert({
    module: "vehicle-manager",
    recordType: "vm_vehicle",
    recordId: item.id,
    recordLabel: `${item.vehicleNumber} ${item.make} ${item.model}`.trim(),
    before,
    after: item,
    createDescription: `VM vehicle added: ${item.vehicleNumber}`,
    updateDescription: `VM vehicle updated: ${item.vehicleNumber}`,
    page: "/admin#vehicle-manager",
  });
}

export async function deleteVmVehicle(id: string) {
  const before =
    (await fetchDbRowById("vm_vehicles", id, rowToVmVehicle)) ??
    (await loadVmVehicles()).find((v) => v.id === id) ??
    null;
  if (useDatabase()) {
    const { error: ordersError } = await requireAdminClient()
      .from("vm_service_orders")
      .delete()
      .eq("vehicle_id", id);
    throwOnError(ordersError, "Could not delete vehicle service history");
    const { error } = await requireAdminClient().from("vm_vehicles").delete().eq("id", id);
    throwOnError(error, "Could not delete vehicle");
  } else {
    writeJson(
      "vm-vehicles.json",
      (await loadVmVehicles()).filter((v) => v.id !== id),
    );
    writeJson(
      "vm-service-orders.json",
      (await loadVmServiceOrders()).filter((o) => o.vehicleId !== id),
    );
  }
  void auditDelete({
    module: "vehicle-manager",
    recordType: "vm_vehicle",
    recordId: id,
    recordLabel: before?.vehicleNumber,
    before,
    description: `VM vehicle deleted: ${before?.vehicleNumber || id}`,
    page: "/admin#vehicle-manager",
  });
}

// —— Parts ——

export async function loadVmParts(): Promise<VmPart[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient().from("vm_parts").select("*").order("name");
    throwOnError(error, "Could not load parts");
    return (data ?? []).map(rowToVmPart);
  }
  return readJson<VmPart[]>("vm-parts.json", []);
}

export async function upsertVmPart(item: VmPart) {
  const before =
    (await fetchDbRowById("vm_parts", item.id, rowToVmPart)) ??
    (await loadVmParts()).find((p) => p.id === item.id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_parts").upsert(vmPartToRow(item));
    throwOnError(error, "Could not save part");
  } else {
    const items = await loadVmParts();
    const idx = items.findIndex((p) => p.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    writeJson("vm-parts.json", items);
  }
  void auditUpsert({
    module: "vehicle-manager",
    recordType: "vm_part",
    recordId: item.id,
    recordLabel: item.name,
    before,
    after: item,
    createDescription: `VM part added: ${item.name}`,
    updateDescription: `VM part updated: ${item.name}`,
    page: "/admin#vehicle-manager",
  });
}

export async function deleteVmPart(id: string) {
  const before =
    (await fetchDbRowById("vm_parts", id, rowToVmPart)) ??
    (await loadVmParts()).find((p) => p.id === id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_parts").delete().eq("id", id);
    throwOnError(error, "Could not delete part");
  } else {
    writeJson(
      "vm-parts.json",
      (await loadVmParts()).filter((p) => p.id !== id),
    );
  }
  void auditDelete({
    module: "vehicle-manager",
    recordType: "vm_part",
    recordId: id,
    recordLabel: before?.name,
    before,
    description: `VM part deleted: ${before?.name || id}`,
    page: "/admin#vehicle-manager",
  });
}

// —— Activities ——

export async function loadVmActivities(): Promise<VmActivity[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient().from("vm_activities").select("*").order("name");
    throwOnError(error, "Could not load activities");
    return (data ?? []).map(rowToVmActivity);
  }
  return readJson<VmActivity[]>("vm-activities.json", []);
}

export async function upsertVmActivity(item: VmActivity) {
  const before =
    (await fetchDbRowById("vm_activities", item.id, rowToVmActivity)) ??
    (await loadVmActivities()).find((a) => a.id === item.id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_activities").upsert(vmActivityToRow(item));
    throwOnError(error, "Could not save activity");
  } else {
    const items = await loadVmActivities();
    const idx = items.findIndex((a) => a.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    writeJson("vm-activities.json", items);
  }
  void auditUpsert({
    module: "vehicle-manager",
    recordType: "vm_activity",
    recordId: item.id,
    recordLabel: item.name,
    before,
    after: item,
    createDescription: `VM activity added: ${item.name}`,
    updateDescription: `VM activity updated: ${item.name}`,
    page: "/admin#vehicle-manager",
  });
}

export async function deleteVmActivity(id: string) {
  const before =
    (await fetchDbRowById("vm_activities", id, rowToVmActivity)) ??
    (await loadVmActivities()).find((a) => a.id === id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_activities").delete().eq("id", id);
    throwOnError(error, "Could not delete activity");
  } else {
    writeJson(
      "vm-activities.json",
      (await loadVmActivities()).filter((a) => a.id !== id),
    );
  }
  void auditDelete({
    module: "vehicle-manager",
    recordType: "vm_activity",
    recordId: id,
    recordLabel: before?.name,
    before,
    description: `VM activity deleted: ${before?.name || id}`,
    page: "/admin#vehicle-manager",
  });
}

// —— Service orders ——

export async function loadVmServiceOrders(vehicleId?: string): Promise<VmServiceOrder[]> {
  if (useDatabase()) {
    let query = requireAdminClient()
      .from("vm_service_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (vehicleId) query = query.eq("vehicle_id", vehicleId);
    const { data, error } = await query;
    throwOnError(error, "Could not load service orders");
    return (data ?? []).map(rowToVmServiceOrder);
  }
  const all = readJson<VmServiceOrder[]>("vm-service-orders.json", []);
  return vehicleId ? all.filter((o) => o.vehicleId === vehicleId) : all;
}

export async function upsertVmServiceOrder(item: VmServiceOrder) {
  const before =
    (await fetchDbRowById("vm_service_orders", item.id, rowToVmServiceOrder)) ??
    (await loadVmServiceOrders()).find((o) => o.id === item.id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_service_orders").upsert(vmServiceOrderToRow(item));
    throwOnError(error, "Could not save service order");
  } else {
    const items = await loadVmServiceOrders();
    const idx = items.findIndex((o) => o.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    writeJson("vm-service-orders.json", items);
  }
  void auditUpsert({
    module: "vehicle-manager",
    recordType: "vm_service_order",
    recordId: item.id,
    recordLabel: item.workNeeded || item.id,
    before,
    after: item,
    createDescription: `VM service order created`,
    updateDescription: `VM service order updated`,
    page: "/admin#vehicle-manager",
  });
}

export async function deleteVmServiceOrder(id: string) {
  const before =
    (await fetchDbRowById("vm_service_orders", id, rowToVmServiceOrder)) ??
    (await loadVmServiceOrders()).find((o) => o.id === id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_service_orders").delete().eq("id", id);
    throwOnError(error, "Could not delete service order");
  } else {
    writeJson(
      "vm-service-orders.json",
      (await loadVmServiceOrders()).filter((o) => o.id !== id),
    );
  }
  void auditDelete({
    module: "vehicle-manager",
    recordType: "vm_service_order",
    recordId: id,
    recordLabel: before?.workNeeded,
    before,
    description: `VM service order deleted`,
    page: "/admin#vehicle-manager",
  });
}

// —— Checklists ——

export async function loadVmChecklists(): Promise<VmChecklist[]> {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("vm_checklists")
      .select("*")
      .order("created_at", { ascending: false });
    throwOnError(error, "Could not load checklists");
    return (data ?? []).map(rowToVmChecklist);
  }
  return readJson<VmChecklist[]>("vm-checklists.json", []);
}

export async function upsertVmChecklist(item: VmChecklist) {
  const before =
    (await fetchDbRowById("vm_checklists", item.id, rowToVmChecklist)) ??
    (await loadVmChecklists()).find((c) => c.id === item.id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_checklists").upsert(vmChecklistToRow(item));
    throwOnError(error, "Could not save checklist");
  } else {
    const items = await loadVmChecklists();
    const idx = items.findIndex((c) => c.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    writeJson("vm-checklists.json", items);
  }
  void auditUpsert({
    module: "vehicle-manager",
    recordType: "vm_checklist",
    recordId: item.id,
    recordLabel: item.name,
    before,
    after: item,
    createDescription: `VM checklist created: ${item.name}`,
    updateDescription: `VM checklist updated: ${item.name}`,
    page: "/admin#vehicle-checklists",
  });
}

export async function deleteVmChecklist(id: string) {
  const before =
    (await fetchDbRowById("vm_checklists", id, rowToVmChecklist)) ??
    (await loadVmChecklists()).find((c) => c.id === id) ??
    null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("vm_checklists").delete().eq("id", id);
    throwOnError(error, "Could not delete checklist");
  } else {
    writeJson(
      "vm-checklists.json",
      (await loadVmChecklists()).filter((c) => c.id !== id),
    );
  }
  void auditDelete({
    module: "vehicle-manager",
    recordType: "vm_checklist",
    recordId: id,
    recordLabel: before?.name,
    before,
    description: `VM checklist deleted: ${before?.name || id}`,
    page: "/admin#vehicle-checklists",
  });
}
