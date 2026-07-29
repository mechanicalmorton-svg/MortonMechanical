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

/** Per-category flags (Founder-managed). Missing keys default to true. */
export type InventoryCategoryFlags = {
  /** Selected for inventory forms / All parts category list. */
  enabled: boolean;
  /** Shown when adding parts to a work order. */
  showInWorkOrders: boolean;
};

export type InventoryCategorySettingsMap = Record<string, Partial<InventoryCategoryFlags>>;

export const DEFAULT_CATEGORY_FLAGS: InventoryCategoryFlags = {
  enabled: true,
  showInWorkOrders: true,
};

export function isDefaultInventoryCategory(name: string) {
  const key = normalizeCategoryName(name).toLowerCase();
  return (DEFAULT_INVENTORY_CATEGORIES as readonly string[]).some((item) => item.toLowerCase() === key);
}

/** Prefer the canonical default spelling when the name matches a built-in. */
export function canonicalizeCategoryName(raw: string) {
  const normalized = normalizeCategoryName(raw);
  if (!normalized) return "";
  const match = (DEFAULT_INVENTORY_CATEGORIES as readonly string[]).find(
    (item) => item.toLowerCase() === normalized.toLowerCase(),
  );
  return match ?? normalized;
}

/** Unique category names used on inventory parts (skips blank / Uncategorized). */
export function categoriesFromInventoryItems(
  items: Array<{ category?: string | null }>,
): string[] {
  const byKey = new Map<string, string>();
  for (const item of items) {
    const name = canonicalizeCategoryName(item.category ?? "");
    if (!name) continue;
    if (name.toLowerCase() === "uncategorized") continue;
    const key = name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, name);
  }
  return [...byKey.values()];
}

export function normalizeCategoryName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function categorySettingsKey(name: string) {
  return normalizeCategoryName(name).toLowerCase();
}

export function resolveCategoryFlags(
  name: string,
  settings: InventoryCategorySettingsMap = {},
): InventoryCategoryFlags {
  const raw = settings[categorySettingsKey(name)] ?? {};
  return {
    enabled: raw.enabled !== false,
    showInWorkOrders: raw.showInWorkOrders !== false,
  };
}

export function mergeInventoryCategories(custom: string[] = [], extra: string[] = []) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of [...DEFAULT_INVENTORY_CATEGORIES, ...custom, ...extra]) {
    const normalized = canonicalizeCategoryName(name);
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

/** Categories selected for inventory forms (enabled). Always includes `current` if provided. */
export function enabledInventoryCategories(
  categories: string[],
  settings: InventoryCategorySettingsMap,
  current?: string,
) {
  const enabled = categories.filter((name) => resolveCategoryFlags(name, settings).enabled);
  return sortInventoryCategories(mergeInventoryCategories(enabled, current ? [current] : []));
}

/** Category names allowed when adding parts to a work order. */
export function workOrderVisibleCategories(categories: string[], settings: InventoryCategorySettingsMap) {
  return categories.filter((name) => {
    const flags = resolveCategoryFlags(name, settings);
    return flags.enabled && flags.showInWorkOrders;
  });
}
