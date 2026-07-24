import { DEFAULT_CONTENT, type SiteContent } from "./content-types";

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

export function normalizeContent(stored: Partial<SiteContent> = {}): SiteContent {
  return deepMerge(DEFAULT_CONTENT, stored);
}
