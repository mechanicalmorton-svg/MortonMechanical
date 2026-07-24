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

/** Public brand name — drop legal suffixes like LLC from display. */
function cleanBusinessName(name: string) {
  return name
    .replace(/,?\s*\bL\.?L\.?C\.?\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeContent(stored: Partial<SiteContent> = {}): SiteContent {
  const content = deepMerge(DEFAULT_CONTENT, stored);
  const cleaned = cleanBusinessName(content.site.name);
  content.site.name = cleaned || DEFAULT_CONTENT.site.name;
  // Prefer the updated public label even if older content still says "Staff login".
  if (/^staff\s*login$/i.test(content.footer.staffLoginLabel.trim())) {
    content.footer.staffLoginLabel = DEFAULT_CONTENT.footer.staffLoginLabel;
  }
  return content;
}
