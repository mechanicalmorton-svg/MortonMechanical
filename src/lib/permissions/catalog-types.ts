export type PermissionAction = string;

export type PermissionDef = {
  key: string;
  module: string;
  action: PermissionAction;
  label: string;
  description?: string;
  dependsOn?: string[];
};

export type PermissionModuleGroup = {
  id: string;
  label: string;
  description: string;
  tabs: string[];
  permissions: PermissionDef[];
};
