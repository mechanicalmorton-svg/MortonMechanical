/** Runtime permission registry — features register modules/keys; Founders assign grants in DB. */

import type { PermissionDef, PermissionModuleGroup } from "./catalog-types";

export type { PermissionDef, PermissionModuleGroup };

const modules = new Map<string, PermissionModuleGroup>();
const keyIndex = new Map<string, PermissionDef>();

function rebuildKeyIndex() {
  keyIndex.clear();
  for (const module of modules.values()) {
    for (const permission of module.permissions) {
      keyIndex.set(permission.key, permission);
    }
  }
}

export function registerModule(input: {
  id: string;
  label: string;
  description: string;
  tabs?: string[];
  permissions: {
    action: string;
    label: string;
    description?: string;
    dependsOn?: string[];
    /** Dashboard tabs unlocked when this permission is granted. */
    unlocksTabs?: string[];
    /** When true, shown in matrix as planned / not yet enforced everywhere. */
    comingSoon?: boolean;
  }[];
}): PermissionModuleGroup {
  const group: PermissionModuleGroup = {
    id: input.id,
    label: input.label,
    description: input.description,
    tabs: input.tabs ?? [],
    permissions: input.permissions.map((item) => ({
      key: `${input.id}.${item.action}`,
      module: input.id,
      action: item.action,
      label: item.label,
      description: item.comingSoon
        ? [item.description, "Coming soon — assign now to prepare roles."].filter(Boolean).join(" ")
        : item.description,
      unlocksTabs: item.unlocksTabs,
      dependsOn: item.dependsOn ?? (item.action !== "view" && !item.action.startsWith("widget.")
        ? [`${input.id}.view`]
        : item.action.startsWith("widget.")
          ? [`${input.id}.view`]
          : undefined),
    })),
  };
  modules.set(group.id, group);
  rebuildKeyIndex();
  return group;
}

export function registerPermission(input: {
  key: string;
  module: string;
  label: string;
  description?: string;
  dependsOn?: string[];
}): PermissionDef {
  const action = input.key.startsWith(`${input.module}.`)
    ? input.key.slice(input.module.length + 1)
    : input.key;
  let group = modules.get(input.module);
  if (!group) {
    group = {
      id: input.module,
      label: input.module,
      description: "",
      tabs: [],
      permissions: [],
    };
    modules.set(input.module, group);
  }
  const def: PermissionDef = {
    key: input.key,
    module: input.module,
    action,
    label: input.label,
    description: input.description,
    dependsOn: input.dependsOn,
  };
  const existing = group.permissions.findIndex((permission) => permission.key === input.key);
  if (existing >= 0) group.permissions[existing] = def;
  else group.permissions.push(def);
  keyIndex.set(def.key, def);
  return def;
}

export function getRegisteredModules(): PermissionModuleGroup[] {
  return [...modules.values()];
}

export function getRegisteredKeys(): string[] {
  return [...keyIndex.keys()];
}

export function getRegisteredPermission(key: string): PermissionDef | undefined {
  return keyIndex.get(key);
}

export function isRegisteredPermissionKey(value: unknown): value is string {
  return typeof value === "string" && keyIndex.has(value);
}

/** Reset registry (tests). */
export function clearPermissionRegistry() {
  modules.clear();
  keyIndex.clear();
}
