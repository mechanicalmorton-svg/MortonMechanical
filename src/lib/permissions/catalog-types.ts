export type PermissionAction = string;

export type PermissionDef = {
  key: string;
  module: string;
  action: PermissionAction;
  label: string;
  description?: string;
  dependsOn?: string[];
  /** When set, granting this key unlocks these dashboard tabs (workspace-level access). */
  unlocksTabs?: string[];
};

export type PermissionModuleGroup = {
  id: string;
  label: string;
  description: string;
  tabs: string[];
  permissions: PermissionDef[];
};
