export const DEFAULT_INVENTORY_CATEGORIES = [
  "General",
  "Filters",
  "Fluids",
  "Brakes",
  "Electrical",
  "Engine",
  "Belts",
  "Batteries",
  "Tires",
  "Tools",
  "Other",
] as const;

export type DefaultInventoryCategory = (typeof DEFAULT_INVENTORY_CATEGORIES)[number];

export function isDefaultInventoryCategory(name: string) {
  return (DEFAULT_INVENTORY_CATEGORIES as readonly string[]).includes(name);
}

export function normalizeCategoryName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function mergeInventoryCategories(custom: string[] = [], extra: string[] = []) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of [...DEFAULT_INVENTORY_CATEGORIES, ...custom, ...extra]) {
    const normalized = normalizeCategoryName(name);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function sortInventoryCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    const ai = (DEFAULT_INVENTORY_CATEGORIES as readonly string[]).indexOf(a);
    const bi = (DEFAULT_INVENTORY_CATEGORIES as readonly string[]).indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}
