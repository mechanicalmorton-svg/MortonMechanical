import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient } from "./supabase/db";

function catalogEnabled() {
  return isSupabaseConfigured();
}

export type CatalogMake = { id: number; name: string };

export async function loadCatalogMakes(): Promise<CatalogMake[]> {
  if (!catalogEnabled()) return [];
  const { data, error } = await requireAdminClient().from("makes").select("id, name").order("name");
  if (error || !data?.length) return [];
  return data.map((row) => ({ id: Number(row.id), name: String(row.name) }));
}

export async function loadCatalogModels(makeId?: number, makeName?: string, year?: number): Promise<string[]> {
  if (!catalogEnabled()) return [];

  let makeIds: number[] = [];
  if (makeId) {
    makeIds = [makeId];
  } else if (makeName?.trim()) {
    const { data } = await requireAdminClient()
      .from("makes")
      .select("id")
      .ilike("name", makeName.trim());
    makeIds = (data ?? []).map((row) => Number(row.id));
  }

  if (!makeIds.length) return [];

  let query = requireAdminClient().from("models").select("name, first_year, last_year").in("make_id", makeIds);
  const { data, error } = await query.order("name");
  if (error || !data?.length) return [];

  const yr = year ? Number(year) : null;
  return [
    ...new Set(
      data
        .filter((row) => {
          if (!yr) return true;
          const first = row.first_year != null ? Number(row.first_year) : null;
          const last = row.last_year != null ? Number(row.last_year) : null;
          if (first != null && yr < first) return false;
          if (last != null && yr > last) return false;
          return true;
        })
        .map((row) => String(row.name).trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export async function loadCatalogTrims(modelName?: string, makeId?: number): Promise<string[]> {
  if (!catalogEnabled() || !modelName?.trim()) return [];

  let modelQuery = requireAdminClient().from("models").select("id").ilike("name", modelName.trim());
  if (makeId) modelQuery = modelQuery.eq("make_id", makeId);
  const { data: models } = await modelQuery;
  const modelIds = (models ?? []).map((row) => Number(row.id));
  if (!modelIds.length) return [];

  const { data, error } = await requireAdminClient()
    .from("trims")
    .select("name")
    .in("model_id", modelIds)
    .order("name");
  if (error || !data?.length) return [];
  return [...new Set(data.map((row) => String(row.name).trim()).filter(Boolean))];
}
