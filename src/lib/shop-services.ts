import { readJson, writeJson, newId } from "./store";
import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";
import { auditDelete, auditUpsert } from "./audit-instrument";
import type { ShopService, ShopServiceAddon, ShopServiceFaq, ShopServicePartRef } from "./shop-types";

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function rowToShopService(r: Record<string, unknown>): ShopService {
  return {
    id: r.id as string,
    name: r.name as string,
    category: (r.category as string) || "Custom Repairs",
    description: (r.description as string) || undefined,
    estimatedDurationMinutes: Number(r.estimated_duration_minutes ?? 60) || 60,
    laborHours: Number(r.labor_hours ?? 1) || 0,
    startingPrice: Number(r.starting_price ?? 0) || 0,
    photoUrl: (r.photo_url as string) || undefined,
    warranty: (r.warranty as string) || undefined,
    faqs: asArray<ShopServiceFaq>(r.faqs),
    requiredParts: asArray<ShopServicePartRef>(r.required_parts),
    optionalAddons: asArray<ShopServiceAddon>(r.optional_addons),
    maintenanceIntervalMiles:
      r.maintenance_interval_miles != null ? Number(r.maintenance_interval_miles) : undefined,
    maintenanceIntervalMonths:
      r.maintenance_interval_months != null ? Number(r.maintenance_interval_months) : undefined,
    active: r.active !== false,
    sortOrder: Number(r.sort_order ?? 0) || 0,
    createdAt: (r.created_at as string) || new Date().toISOString(),
    updatedAt: (r.updated_at as string) || new Date().toISOString(),
  };
}

function shopServiceToRow(s: ShopService) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description ?? "",
    estimated_duration_minutes: s.estimatedDurationMinutes,
    labor_hours: s.laborHours,
    starting_price: s.startingPrice,
    photo_url: s.photoUrl ?? "",
    warranty: s.warranty ?? "",
    faqs: s.faqs ?? [],
    required_parts: s.requiredParts ?? [],
    optional_addons: s.optionalAddons ?? [],
    maintenance_interval_miles: s.maintenanceIntervalMiles ?? null,
    maintenance_interval_months: s.maintenanceIntervalMonths ?? null,
    active: s.active,
    sort_order: s.sortOrder,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

const FALLBACK_SEED: ShopService[] = [
  {
    id: "svc_oil_change",
    name: "Oil Change",
    category: "Oil Changes",
    description: "Standard oil and filter service.",
    estimatedDurationMinutes: 45,
    laborHours: 0.5,
    startingPrice: 79,
    faqs: [],
    requiredParts: [],
    optionalAddons: [],
    active: true,
    sortOrder: 10,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "svc_brake_repair",
    name: "Brake Repair",
    category: "Brake Repairs",
    description: "Inspect and service brakes.",
    estimatedDurationMinutes: 120,
    laborHours: 2,
    startingPrice: 199,
    faqs: [],
    requiredParts: [],
    optionalAddons: [],
    active: true,
    sortOrder: 20,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "svc_diagnostics",
    name: "Diagnostics",
    category: "Diagnostics",
    description: "Computer and systems diagnosis.",
    estimatedDurationMinutes: 60,
    laborHours: 1,
    startingPrice: 129,
    faqs: [],
    requiredParts: [],
    optionalAddons: [],
    active: true,
    sortOrder: 30,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "svc_ac_repair",
    name: "AC Repair",
    category: "AC Repair",
    description: "A/C performance diagnosis and repair.",
    estimatedDurationMinutes: 90,
    laborHours: 1.5,
    startingPrice: 149,
    faqs: [],
    requiredParts: [],
    optionalAddons: [],
    active: true,
    sortOrder: 40,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "svc_custom",
    name: "Custom Repair",
    category: "Custom Repairs",
    description: "Custom or multi-point repair work.",
    estimatedDurationMinutes: 90,
    laborHours: 1.5,
    startingPrice: 0,
    faqs: [],
    requiredParts: [],
    optionalAddons: [],
    active: true,
    sortOrder: 100,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

function missingCatalogError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("shop_services") &&
    (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("could not find"))
  );
}

export async function loadShopServices(opts?: { activeOnly?: boolean }): Promise<ShopService[]> {
  if (useDatabase()) {
    let request = requireAdminClient()
      .from("shop_services")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (opts?.activeOnly) request = request.eq("active", true);
    const { data, error } = await request;
    if (error) {
      if (missingCatalogError(error.message)) {
        throw new Error(
          "Service catalog is not ready. Run supabase/add-shop-services.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(error, "Could not load services");
    }
    return (data ?? []).map((row) => rowToShopService(row as Record<string, unknown>));
  }

  const items = readJson<ShopService[]>("shop-services.json", FALLBACK_SEED);
  return (opts?.activeOnly ? items.filter((item) => item.active) : items).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}

export async function getShopServiceById(id: string) {
  const services = await loadShopServices();
  return services.find((item) => item.id === id) ?? null;
}

export async function upsertShopService(item: ShopService) {
  const before = (await loadShopServices()).find((s) => s.id === item.id) ?? null;
  const next = { ...item, updatedAt: new Date().toISOString() };
  if (!next.createdAt) next.createdAt = next.updatedAt;

  if (useDatabase()) {
    const { error } = await requireAdminClient().from("shop_services").upsert(shopServiceToRow(next));
    if (error) {
      if (missingCatalogError(error.message)) {
        throw new Error(
          "Service catalog is not ready. Run supabase/add-shop-services.sql in the Supabase SQL editor.",
        );
      }
      throwOnError(error, "Could not save service");
    }
  } else {
    const items = await loadShopServices();
    const idx = items.findIndex((s) => s.id === item.id);
    if (idx >= 0) items[idx] = next;
    else items.unshift(next);
    writeJson("shop-services.json", items);
  }

  void auditUpsert({
    module: "bookings",
    recordType: "settings",
    recordId: next.id,
    recordLabel: next.name,
    before,
    after: next,
    createDescription: `Service created: ${next.name}`,
    updateDescription: `Service updated: ${next.name}`,
    page: "/admin#bookings",
  });
  return next;
}

export async function deleteShopService(id: string) {
  const before = (await loadShopServices()).find((s) => s.id === id) ?? null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("shop_services").delete().eq("id", id);
    throwOnError(error, "Could not delete service");
  } else {
    writeJson(
      "shop-services.json",
      (await loadShopServices()).filter((s) => s.id !== id),
    );
  }
  void auditDelete({
    module: "bookings",
    recordType: "settings",
    recordId: id,
    recordLabel: before?.name,
    before,
    description: `Service deleted: ${before?.name || id}`,
    page: "/admin#bookings",
  });
}

export function newShopServiceId() {
  return `svc_${newId().replace(/-/g, "").slice(0, 12)}`;
}
