import { readJson, writeJson, newId } from "@/lib/store";
import { getCustomerVehicleById } from "@/lib/shop-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "@/lib/supabase/db";
import type { VehicleServiceHistoryEntry } from "@/lib/shop-types";

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

function missingTableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("customer_vehicle_service_history") &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("could not find"))
  );
}

function rowToEntry(r: Record<string, unknown>): VehicleServiceHistoryEntry {
  return {
    id: r.id as string,
    customerVehicleId: r.customer_vehicle_id as string,
    performedOn: (r.performed_on as string) || "",
    mileage: r.mileage != null && Number.isFinite(Number(r.mileage)) ? Number(r.mileage) : undefined,
    category: (r.category as string) || "Service",
    summary: (r.summary as string) || "",
    description: (r.description as string) || undefined,
    workOrderId: (r.work_order_id as string) || undefined,
    bookingId: (r.booking_id as string) || undefined,
    createdAt: r.created_at as string,
  };
}

function entryToRow(entry: VehicleServiceHistoryEntry) {
  return {
    id: entry.id,
    customer_vehicle_id: entry.customerVehicleId,
    performed_on: entry.performedOn,
    mileage: entry.mileage ?? null,
    category: entry.category,
    summary: entry.summary,
    description: entry.description ?? "",
    work_order_id: entry.workOrderId ?? null,
    booking_id: entry.bookingId ?? null,
    created_at: entry.createdAt,
  };
}

export async function loadVehicleServiceHistory(customerVehicleId: string) {
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("customer_vehicle_service_history")
      .select("*")
      .eq("customer_vehicle_id", customerVehicleId)
      .order("performed_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      if (missingTableError(error.message)) {
        throw new Error(
          "Vehicle service history is not ready. Run supabase/add-vehicle-service-history.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(error, "Could not load service history");
    }
    return (data ?? []).map((row) => rowToEntry(row as Record<string, unknown>));
  }

  return readJson<VehicleServiceHistoryEntry[]>("vehicle-service-history.json", [])
    .filter((entry) => entry.customerVehicleId === customerVehicleId)
    .sort((a, b) => b.performedOn.localeCompare(a.performedOn) || b.createdAt.localeCompare(a.createdAt));
}

export async function upsertVehicleServiceHistory(entry: VehicleServiceHistoryEntry) {
  const vehicle = await getCustomerVehicleById(entry.customerVehicleId);
  if (!vehicle) throw new Error("Customer vehicle not found.");

  const next: VehicleServiceHistoryEntry = {
    ...entry,
    summary: entry.summary.trim(),
    category: entry.category.trim() || "Service",
    description: entry.description?.trim() || undefined,
    performedOn: entry.performedOn.trim() || new Date().toISOString().slice(0, 10),
  };
  if (!next.summary) throw new Error("Summary is required.");

  if (useDatabase()) {
    const { error } = await requireAdminClient()
      .from("customer_vehicle_service_history")
      .upsert(entryToRow(next));
    if (error) {
      if (missingTableError(error.message)) {
        throw new Error(
          "Vehicle service history is not ready. Run supabase/add-vehicle-service-history.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(error, "Could not save service history");
    }
  } else {
    const items = readJson<VehicleServiceHistoryEntry[]>("vehicle-service-history.json", []);
    const idx = items.findIndex((item) => item.id === next.id);
    if (idx >= 0) items[idx] = next;
    else items.unshift(next);
    writeJson("vehicle-service-history.json", items);
  }

  return next;
}

export async function deleteVehicleServiceHistory(id: string) {
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("customer_vehicle_service_history").delete().eq("id", id);
    throwOnError(error, "Could not delete service history");
  } else {
    writeJson(
      "vehicle-service-history.json",
      readJson<VehicleServiceHistoryEntry[]>("vehicle-service-history.json", []).filter((item) => item.id !== id),
    );
  }
  return { ok: true as const };
}

export function newServiceHistoryId() {
  return newId();
}
