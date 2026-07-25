import { cache } from "react";
import { readJson, writeJson } from "./store";
import type { SiteContent } from "./content-types";
import { normalizeContent } from "./content-normalize";
import { getSupabasePublic, isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";

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
  return normalizeContent(stored);
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
  const c = normalizeContent((data ?? {}) as Partial<SiteContent>);
  if (!c.site.name.trim()) throw new Error("Please enter a business name.");
  if (!c.site.phone.trim()) throw new Error("Please enter a phone number.");
  if (!c.site.email.trim()) throw new Error("Please enter an email address.");
  return c;
}
