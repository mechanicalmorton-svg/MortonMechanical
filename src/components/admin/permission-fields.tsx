"use client";

import type { ReactNode } from "react";
import { usePermissions } from "./permissions";

type FieldMode = "hidden" | "view" | "edit";

/**
 * Resolve field visibility from registered keys:
 * - `{base}.edit` → editable
 * - `{base}.view` → read-only
 * - neither → hidden (render null)
 */
export function useFieldPermission(baseKey: string): FieldMode {
  const { hasPermission, isFounder } = usePermissions();
  if (isFounder) return "edit";
  if (hasPermission(`${baseKey}.edit`)) return "edit";
  if (hasPermission(`${baseKey}.view`)) return "view";
  // Umbrella module edit/view as fallback for coarse grants
  const module = baseKey.split(".")[0];
  if (hasPermission(`${module}.edit`)) return "edit";
  if (hasPermission(`${module}.view`)) return "view";
  return "hidden";
}

export function CanField({
  field,
  children,
  readOnlyFallback,
}: {
  /** e.g. customers.field.tax_id */
  field: string;
  children: ReactNode;
  readOnlyFallback?: ReactNode;
}) {
  const mode = useFieldPermission(field);
  if (mode === "hidden") return null;
  if (mode === "view") return <>{readOnlyFallback ?? children}</>;
  return <>{children}</>;
}

export function CanColumn({
  column,
  children,
}: {
  /** e.g. customers.column.lifetime_spend */
  column: string;
  children: ReactNode;
}) {
  const { hasPermission, isFounder } = usePermissions();
  if (isFounder || hasPermission(column) || hasPermission(`${column}.view`)) {
    return <>{children}</>;
  }
  const module = column.split(".")[0];
  if (hasPermission(`${module}.view`)) return <>{children}</>;
  return null;
}

export function CanTab({
  tab,
  children,
}: {
  /** e.g. customers.tab.invoices */
  tab: string;
  children: ReactNode;
}) {
  const { hasPermission, isFounder } = usePermissions();
  if (isFounder || hasPermission(tab) || hasPermission(`${tab}.view`)) {
    return <>{children}</>;
  }
  return null;
}
