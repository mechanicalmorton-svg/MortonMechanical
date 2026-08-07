import { DEFAULT_CONTENT, type SiteContent } from "./content-types";
import { normalizePageLayout } from "./page-layout";

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
  const merged = {
    ...stored,
    // Prefer stored arrays over defaults when present (including empty = intentionally cleared).
    pageLayout: stored.pageLayout ?? DEFAULT_CONTENT.pageLayout,
    customBlocks: stored.customBlocks ?? DEFAULT_CONTENT.customBlocks,
  };
  const content = deepMerge(DEFAULT_CONTENT, merged);
  if (Array.isArray(stored.customBlocks)) content.customBlocks = stored.customBlocks;
  if (stored.pageLayout?.sections) content.pageLayout = { sections: stored.pageLayout.sections };

  const cleaned = cleanBusinessName(content.site.name);
  content.site.name = cleaned || DEFAULT_CONTENT.site.name;
  if (/^staff\s*login$/i.test(content.footer.staffLoginLabel.trim())) {
    content.footer.staffLoginLabel = DEFAULT_CONTENT.footer.staffLoginLabel;
  }
  if (/^submit\s*request$/i.test(content.pages.form.submitText.trim())) {
    content.pages.form.submitText = DEFAULT_CONTENT.pages.form.submitText;
  }
  return normalizePageLayout(content);
}
