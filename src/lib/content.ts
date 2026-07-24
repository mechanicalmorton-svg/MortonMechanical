import { cache } from "react";
import { readJson, writeJson } from "./store";
import { DEFAULT_CONTENT, type SiteContent } from "./content-types";
import { getSupabaseAdmin, getSupabasePublic, isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const val = patch[key];
    if (val && typeof val === "object" && !Array.isArray(val) && typeof base[key] === "object" && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key] as Record<string, unknown>, val as Record<string, unknown>) as T[keyof T];
    } else if (val !== undefined) {
      out[key] = val as T[keyof T];
    }
  }
  return out;
}

async function fetchStoredContent(): Promise<Partial<SiteContent>> {
  requireDatabaseInProduction();
  if (isSupabaseConfigured()) {
    const sb = getSupabasePublic() ?? requireAdminClient();
    const { data, error } = await sb.from("site_content").select("content").eq("id", 1).maybeSingle();
    throwOnError(error, "Could not load site content");
    return (data?.content as Partial<SiteContent>) ?? {};
  }
  return readJson<Partial<SiteContent>>("content.json", {});
}

export const getContent = cache(async (): Promise<SiteContent> => {
  const stored = await fetchStoredContent();
  return deepMerge(DEFAULT_CONTENT, stored);
});

export async function saveContent(content: SiteContent) {
  requireDatabaseInProduction();
  if (isSupabaseConfigured()) {
    const { error } = await requireAdminClient()
      .from("site_content")
      .upsert({ id: 1, content, updated_at: new Date().toISOString() });
    throwOnError(error, "Could not save site content");
    return;
  }
  writeJson("content.json", content);
}

export function validateContent(data: unknown): SiteContent {
  const c = data as SiteContent;
  if (!c?.site?.name?.trim()) throw new Error("Business name is required.");
  if (!c?.site?.phone?.trim()) throw new Error("Phone number is required.");
  if (!c?.site?.email?.trim()) throw new Error("Email is required.");
  if (!c.services?.length) throw new Error("At least one service is required.");
  return c;
}
