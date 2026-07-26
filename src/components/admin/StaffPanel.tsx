"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Pencil, Plus, Shield, Trash2, Upload, Users } from "lucide-react";
import type { StaffMember, StaffRole } from "@/lib/shop-types";
import {
  dashboardTabLabel,
  isProtectedRole,
  isValidRoleColor,
  normalizeRoleColor,
  normalizeRoleIds,
  normalizeRolePermissions,
  pickPrimaryRoleId,
  type RoleDefinition,
  type RolePermissions,
} from "@/lib/role-definitions";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { RoleAccessEditor } from "./RoleAccessEditor";
import { EmptyState, PageHeader, RoleBadge, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";
import { actionsFromLegacy, ensureWorkspaceActions, tabsFromActions } from "@/lib/permissions/catalog";
import { getRegisteredKeys } from "@/lib/permissions/register";

function formatWhen(value?: string | null) {
  if (!value) return "Never signed in";
  return new Date(value).toLocaleString();
}

function memberRoleIds(member: StaffMember) {
  return normalizeRoleIds(member.roleIds, member.role);
}

function memberHasOwnerRole(member: StaffMember) {
  return memberRoleIds(member).includes("owner");
}

function RoleMultiSelect({
  roles,
  value,
  onChange,
  className = "",
  lockOwner = false,
}: {
  roles: RoleDefinition[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  /** Keep Founder checked (e.g. last active Founder editing themselves). */
  lockOwner?: boolean;
}) {
  function toggle(id: string) {
    const has = value.includes(id);
    if (has && value.length <= 1) return;
    if (has && id === "owner" && lockOwner) return;
    onChange(has ? value.filter((roleId) => roleId !== id) : [...value, id]);
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {roles.map((role) => {
        const checked = value.includes(role.id);
        const locked = role.id === "owner" && lockOwner && checked;
        return (
          <label
            key={role.id}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
              locked ? "cursor-default opacity-90" : "cursor-pointer"
            } ${
              checked
                ? "border-amber-500/35 bg-amber-500/10 text-amber-50"
                : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={locked}
              onChange={() => toggle(role.id)}
              className="accent-amber-500"
            />
            {role.name}
          </label>
        );
      })}
    </div>
  );
}

const emptyRoleForm = {
  id: "",
  name: "",
  color: "slate",
  description: "",
  actions: actionsFromLegacy({ tabs: ["dashboard", "work-orders"] }),
  tabs: ["dashboard", "work-orders"] as string[],
  manageUsers: false,
  editSiteContent: false,
  archived: false,
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  roleIds: ["mechanic"] as StaffRole[],
  active: true,
};

type Props = {
  currentUserId?: string;
  /** Called after saving the signed-in user's roles so the sidebar can refresh. */
  onSelfUpdated?: () => void;
};

export function StaffPanel({ currentUserId, onSelfUpdated }: Props) {
  const toast = useAdminToast();
  const [items, setItems] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [multiRoleReady, setMultiRoleReady] = useState(true);
  const [roleIdsSql, setRoleIdsSql] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [form, setForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);

  const roleOptions = useMemo(
    () => roles.filter((role) => !role.permissions.archived || role.id === "owner"),
    [roles],
  );
  const assignedCountByRole = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of items) {
      for (const roleId of memberRoleIds(member)) {
        counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);
  const editingUser = editingUserId ? items.find((item) => item.id === editingUserId) : null;

  const activeOwnerCount = useMemo(
    () => items.filter((member) => member.active && memberHasOwnerRole(member)).length,
    [items],
  );

  async function load() {
    setLoading(true);
    const [staffRes, rolesRes] = await Promise.all([
      fetch("/api/admin/staff"),
      fetch("/api/admin/roles"),
    ]);
    const staffData = await staffRes.json();
    const rolesData = await rolesRes.json();

    if (!staffRes.ok) {
      toast.error(staffData.error ?? "Could not load users.");
      setItems([]);
      setMultiRoleReady(true);
      setRoleIdsSql(undefined);
    } else {
      const list: StaffMember[] = Array.isArray(staffData)
        ? staffData
        : Array.isArray(staffData?.staff)
          ? staffData.staff
          : [];
      setMultiRoleReady(Array.isArray(staffData) ? true : staffData?.multiRoleReady !== false);
      setRoleIdsSql(Array.isArray(staffData) ? undefined : staffData?.roleIdsSql);
      setItems(
        list.map((member: StaffMember) => {
          const roleIds = memberRoleIds(member);
          return { ...member, roleIds, role: pickPrimaryRoleId(roleIds) };
        }),
      );
    }

    if (!rolesRes.ok) {
      toast.error(rolesData.error ?? "Could not load roles.");
      setRoles([]);
    } else {
      setRoles(rolesData);
      if (!form.roleIds.length && rolesData[0]?.id) {
        const defaultId =
          rolesData.find((r: RoleDefinition) => r.id === "mechanic")?.id || rolesData[0].id;
        setForm((prev) => ({ ...prev, roleIds: [defaultId] }));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateUser() {
    const defaultId =
      roles.find((r) => r.id === "mechanic")?.id || roles[0]?.id || "mechanic";
    setEditingUserId(null);
    setForm({ ...emptyUserForm, roleIds: [defaultId] });
    setShowCreate(true);
  }

  function openEditUser(member: StaffMember) {
    setShowCreate(false);
    setEditingUserId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      phone: member.phone || "",
      roleIds: memberRoleIds(member) as StaffRole[],
      active: member.active,
    });
  }

  function closeUserModal() {
    if (savingUser) return;
    setShowCreate(false);
    setEditingUserId(null);
    setForm(emptyUserForm);
  }

  function openCreateRole() {
    setEditingRoleId(null);
    setRoleForm(emptyRoleForm);
    setShowRoleForm(true);
  }

  function openEditRole(role: RoleDefinition) {
    setEditingRoleId(role.id);
    const actions =
      role.id === "owner"
        ? [...getRegisteredKeys()]
        : ensureWorkspaceActions(
            role.permissions.actions?.length
              ? [...role.permissions.actions]
              : actionsFromLegacy(role.permissions),
            role.permissions.tabs,
          );
    setRoleForm({
      id: role.id,
      name: role.name,
      color: role.color,
      description: role.permissions.description ?? "",
      actions,
      tabs: tabsFromActions(actions),
      manageUsers: role.permissions.manageUsers,
      editSiteContent: role.permissions.editSiteContent,
      archived: Boolean(role.permissions.archived),
    });
    setShowRoleForm(true);
  }

  async function cloneRole(role: RoleDefinition) {
    setSavingRole(true);
    const permissions = normalizeRolePermissions({
      ...role.permissions,
      description: role.permissions.description,
      archived: false,
    });
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Copy of ${role.name}`,
        color: role.color,
        permissions,
      }),
    });
    const data = await res.json();
    setSavingRole(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not clone role.");
      return;
    }
    setRoles(data);
    toast.success(`Cloned “${role.name}”.`);
  }

  function exportRolesTemplate() {
    const payload = {
      exportedAt: new Date().toISOString(),
      roles: roles
        .filter((role) => role.id !== "owner")
        .map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          permissions: {
            actions: role.permissions.actions,
            description: role.permissions.description,
            archived: role.permissions.archived,
          },
        })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `role-permissions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Role permission template exported.");
  }

  async function importRolesTemplate(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        roles?: { name?: string; color?: string; permissions?: Partial<RolePermissions> }[];
      };
      if (!Array.isArray(parsed.roles) || !parsed.roles.length) {
        toast.error("No roles found in that file.");
        return;
      }
      setSavingRole(true);
      let last: RoleDefinition[] = roles;
      for (const entry of parsed.roles) {
        const name = String(entry.name ?? "").trim();
        if (!name) continue;
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            color: entry.color || "slate",
            permissions: normalizeRolePermissions(entry.permissions),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? `Could not import “${name}”.`);
          setSavingRole(false);
          return;
        }
        last = data;
      }
      setRoles(last);
      setSavingRole(false);
      toast.success("Role template imported.");
    } catch {
      toast.error("Could not read that JSON file.");
    }
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    const color = normalizeRoleColor(roleForm.color);
    if (!isValidRoleColor(color)) {
      toast.error("Pick a preset or enter a valid hex color.");
      return;
    }
    setSavingRole(true);
    const permissions: RolePermissions = {
      actions: roleForm.actions,
      tabs: roleForm.tabs,
      manageUsers: roleForm.manageUsers,
      editSiteContent: roleForm.editSiteContent,
      description: roleForm.description?.trim() || undefined,
      archived: Boolean(roleForm.archived),
    };
    const res = await fetch("/api/admin/roles", {
      method: editingRoleId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingRoleId || undefined,
        name: roleForm.name,
        color,
        permissions,
      }),
    });
    const data = await res.json();
    setSavingRole(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not save role.");
      return;
    }
    setRoles(data);
    setShowRoleForm(false);
    setEditingRoleId(null);
    toast.success(editingRoleId ? "Role updated." : "Role created.");
  }

  async function removeRole(role: RoleDefinition) {
    if (isProtectedRole(role.id)) {
      toast.error("The Founder role cannot be deleted.");
      return;
    }
    if (!confirm(`Delete role “${role.name}”? Users must be reassigned first.`)) return;
    const res = await fetch("/api/admin/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: role.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not delete role.");
      return;
    }
    setRoles(data);
    toast.success("Role deleted.");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    const roleIds = normalizeRoleIds(form.roleIds, "mechanic");
    if (!multiRoleReady && roleIds.length > 1) {
      toast.error("Run the role_ids SQL in Supabase first so multiple roles can be saved.");
      return;
    }
    setSavingUser(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        roleIds,
        role: pickPrimaryRoleId(roleIds),
      }),
    });
    const data = await res.json();
    setSavingUser(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not create user.");
      return;
    }
    closeUserModal();
    toast.success("User created. They sign in once at /admin/login and see every page their roles allow.");
    load();
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUserId) return;
    if (!multiRoleReady && normalizeRoleIds(form.roleIds, "mechanic").length > 1) {
      toast.error("Run the role_ids SQL in Supabase first so multiple roles can be saved.");
      return;
    }
    const roleIds = normalizeRoleIds(form.roleIds, "mechanic");
    setSavingUser(true);
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingUserId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        active: form.active,
        roleIds,
        role: pickPrimaryRoleId(roleIds),
        ...(form.password.trim() ? { password: form.password } : {}),
      }),
    });
    const data = await res.json();
    setSavingUser(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not update user.");
      return;
    }
    const editedSelf = Boolean(currentUserId && editingUserId === currentUserId);
    closeUserModal();
    toast.success(
      editedSelf
        ? "Your roles were updated. Refreshing your dashboard access…"
        : "User updated. They keep the same login — sidebar pages come from all assigned roles.",
    );
    await load();
    if (editedSelf) onSelfUpdated?.();
  }

  async function setActive(member: StaffMember, active: boolean) {
    if (currentUserId && member.id === currentUserId && !active) {
      toast.error("You cannot deactivate your own account.");
      return;
    }
    if (!active && memberHasOwnerRole(member) && member.active && activeOwnerCount <= 1) {
      toast.error("Cannot deactivate the last Founder account.");
      return;
    }
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, active }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not update user.");
      return;
    }
    toast.success(active ? "User activated." : "User deactivated.");
    load();
  }

  async function remove(id: string, email: string) {
    if (currentUserId && id === currentUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }
    const target = items.find((item) => item.id === id);
    if (target && memberHasOwnerRole(target) && target.active && activeOwnerCount <= 1) {
      toast.error("Cannot delete the last Founder account.");
      return;
    }
    if (!confirm(`Delete ${email} from Supabase Authentication? They will lose portal access.`)) return;
    const res = await fetch("/api/admin/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not delete user.");
      return;
    }
    toast.success("User removed.");
    load();
  }

  const editingRole = editingRoleId ? roles.find((role) => role.id === editingRoleId) : null;
  const ownerLocked = editingRole?.id === "owner";
  const userModalOpen = showCreate || Boolean(editingUserId);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="User Management"
        subtitle="Design roles with exact page access, then assign one or more roles to each staff member. Sidebar pages combine from every role they hold."
        actions={
          <>
            <Can permission="roles.create">
              <button type="button" onClick={openCreateRole} className={btnSecondary}>
                <Shield className="h-4 w-4" /> Add Role
              </button>
            </Can>
            <Can permission="users.create">
              <button type="button" onClick={openCreateUser} className={btnPrimary}>
                <Plus className="h-4 w-4" /> Add User
              </button>
            </Can>
          </>
        }
      />

      {!multiRoleReady ? (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <p className="font-medium">Multi-role storage isn’t set up yet</p>
          <p className="mt-1 text-amber-100/80">
            Run this in the Supabase SQL editor so Founders can save more than one role per user (including themselves):
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-amber-500/20 bg-slate-950/50 p-3 text-xs text-amber-100/90">
            {roleIdsSql || "see supabase/add-staff-role-ids.sql"}
          </pre>
        </div>
      ) : null}

      {!loading && roles.length ? (
        <section className="admin-glass admin-glass-panel mb-6 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">Access control</p>
              <h2 className="mt-1 text-base font-semibold text-white">Roles & permissions</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Assign action permissions; pages unlock from the modules you grant.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Can permission="roles.view">
                <button type="button" onClick={exportRolesTemplate} className={`${btnSecondary} !py-2`} title="Export roles JSON">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
                <label className={`${btnSecondary} !py-2 cursor-pointer`} title="Import roles JSON">
                  <Upload className="h-3.5 w-3.5" />
                  Import
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importRolesTemplate(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </Can>
              <Can permission="roles.create">
                <button type="button" onClick={openCreateRole} className={`${btnSecondary} !py-2`}>
                  <Plus className="h-3.5 w-3.5" />
                  New role
                </button>
              </Can>
            </div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => {
              const actionCount = role.permissions.actions?.length ?? 0;
              const assigned = assignedCountByRole.get(role.id) ?? 0;
              const pagePreview = role.permissions.tabs.slice(0, 4).map(dashboardTabLabel);
              const extraPages = Math.max(0, role.permissions.tabs.length - pagePreview.length);
              return (
                <article
                  key={role.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900/70 via-slate-950/50 to-slate-950/80 p-4 transition hover:border-amber-500/25 hover:shadow-lg hover:shadow-amber-950/10 ${
                    role.permissions.archived ? "border-slate-700/60 opacity-70" : "border-slate-800/80"
                  }`}
                >
                  <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl transition group-hover:bg-amber-500/10" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <RoleBadge role={role.id} roleName={role.name} roleColor={role.color} />
                      {role.permissions.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{role.permissions.description}</p>
                      ) : null}
                      <p className="mt-3 text-xs font-medium text-slate-300">
                        {actionCount} action{actionCount === 1 ? "" : "s"} · {role.permissions.tabs.length} page
                        {role.permissions.tabs.length === 1 ? "" : "s"} · {assigned} user
                        {assigned === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pagePreview.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-0.5 text-[10px] font-medium text-slate-400"
                          >
                            {label}
                          </span>
                        ))}
                        {extraPages > 0 ? (
                          <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            +{extraPages} more
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {role.permissions.manageUsers ? (
                          <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-100">
                            Manage users
                          </span>
                        ) : null}
                        {role.permissions.editSiteContent ? (
                          <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-fuchsia-100">
                            Site contents
                          </span>
                        ) : null}
                        {isProtectedRole(role.id) ? (
                          <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100">
                            Full access
                          </span>
                        ) : null}
                        {role.permissions.archived ? (
                          <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Can permission="roles.create">
                        <button
                          type="button"
                          className={`${btnSecondary} !h-9 !w-9 !px-0`}
                          onClick={() => cloneRole(role)}
                          disabled={savingRole}
                          aria-label={`Clone ${role.name}`}
                          title="Clone role"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </Can>
                      <Can permission="roles.edit">
                        <button
                          type="button"
                          className={`${btnSecondary} !h-9 !w-9 !px-0`}
                          onClick={() => openEditRole(role)}
                          aria-label={`Edit ${role.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </Can>
                      {!isProtectedRole(role.id) ? (
                        <Can permission="roles.delete">
                          <button
                            type="button"
                            className={`${btnDanger} !h-9 !w-9 !px-0`}
                            onClick={() => removeRole(role)}
                            aria-label={`Delete ${role.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Can>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <AdminModal
        open={userModalOpen}
        onClose={closeUserModal}
        title={editingUserId ? "Edit User" : "Add Portal User"}
        wide
      >
        <form onSubmit={editingUserId ? saveUser : createUser} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">
            <span className="font-medium text-slate-200">Full name</span>
            <input
              className={`${inputClass} mt-1.5`}
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            <span className="font-medium text-slate-200">Email</span>
            <input
              className={`${inputClass} mt-1.5`}
              placeholder="Email (@mortonsmechanical.com)"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm text-slate-300">
            <span className="font-medium text-slate-200">
              {editingUserId ? "New password" : "Temporary password"}
            </span>
            <input
              className={`${inputClass} mt-1.5`}
              placeholder={editingUserId ? "Leave blank to keep current" : "Temporary password"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={editingUserId ? undefined : 8}
              required={!editingUserId}
              autoComplete="new-password"
            />
            {editingUserId ? (
              <span className="mt-1 block text-xs text-slate-500">Optional. Leave blank to keep their current password.</span>
            ) : null}
          </label>
          <label className="block text-sm text-slate-300">
            <span className="font-medium text-slate-200">Phone</span>
            <input
              className={`${inputClass} mt-1.5`}
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-200">Roles</p>
            <p className="mb-2 text-xs text-slate-500">
              Assign one or more roles (including yourself as Founder). Same login at{" "}
              <span className="text-slate-300">/admin/login</span> — they see every dashboard page any of
              their roles allow. Mechanic/Dispatcher login pages are optional shortcuts only.
            </p>
            <RoleMultiSelect
              roles={roleOptions}
              value={form.roleIds}
              onChange={(roleIds) => setForm({ ...form, roleIds: roleIds as StaffRole[] })}
              lockOwner={Boolean(
                editingUserId &&
                  form.roleIds.includes("owner") &&
                  activeOwnerCount <= 1 &&
                  (editingUser?.active ?? true),
              )}
            />
            {editingUserId && currentUserId && editingUserId === currentUserId ? (
              <p className="mt-2 text-xs text-amber-200/80">
                You can add Mechanic, Dispatcher, or custom roles to your Founder account. Keep Founder checked if you’re the last Founder.
              </p>
            ) : null}
          </div>
          {editingUserId ? (
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                disabled={Boolean(currentUserId && editingUserId === currentUserId)}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="accent-amber-500"
              />
              Active (can sign in)
              {currentUserId && editingUserId === currentUserId ? (
                <span className="text-xs text-slate-500">· You can’t deactivate yourself</span>
              ) : null}
            </label>
          ) : null}
          {editingUser ? (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Last sign-in: {formatWhen(editingUser.lastSignIn)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 sm:col-span-2">
            <button type="button" onClick={closeUserModal} className={btnSecondary} disabled={savingUser}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={savingUser || !form.name.trim() || !form.email.trim()}>
              {savingUser
                ? "Saving…"
                : editingUserId
                  ? "Save User"
                  : "Create Supabase user"}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={showRoleForm}
        onClose={() => {
          if (savingRole) return;
          setShowRoleForm(false);
          setEditingRoleId(null);
        }}
        title={editingRoleId ? "Edit Role Access" : "Create Role"}
        wide
      >
        <form onSubmit={saveRole} className="space-y-5">
          <RoleAccessEditor value={roleForm} onChange={setRoleForm} ownerLocked={ownerLocked} />

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              className={btnSecondary}
              disabled={savingRole}
              onClick={() => {
                setShowRoleForm(false);
                setEditingRoleId(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={savingRole || !roleForm.name.trim()}>
              <Shield className="h-4 w-4" />
              {savingRole ? "Saving…" : editingRoleId ? "Save Role" : "Add Role"}
            </button>
          </div>
        </form>
      </AdminModal>

      <section className="admin-glass admin-glass-panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">Team</p>
            <h2 className="mt-1 text-base font-semibold text-white">Portal users</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Assign roles to control which pages each person can open.
            </p>
          </div>
          <button type="button" onClick={openCreateUser} className={`${btnPrimary} !py-2`}>
            <Plus className="h-3.5 w-3.5" />
            Add user
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : !items.length ? (
            <EmptyState
              icon={Users}
              title="No portal users yet"
              text="Add a @mortonsmechanical.com user here or create one in Supabase Authentication — they will appear automatically."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((s) => {
                const assignedIds = memberRoleIds(s);
                const assignedRoles = assignedIds
                  .map((id) => roles.find((item) => item.id === id))
                  .filter((item): item is RoleDefinition => Boolean(item));
                const isSelf = Boolean(currentUserId && s.id === currentUserId);
                const isLastOwner = s.active && memberHasOwnerRole(s) && activeOwnerCount <= 1;
                return (
                  <article
                    key={s.id}
                    className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 via-slate-950/40 to-slate-950/70 p-4 transition hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-pink-600/20 text-sm font-bold text-amber-300 ring-1 ring-amber-500/20">
                          {s.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <div>
                          <p className="font-semibold text-white">
                            {s.name}
                            {isSelf ? <span className="ml-2 text-xs font-normal text-slate-500">(you)</span> : null}
                          </p>
                          <p className="text-sm text-slate-400">{s.email}</p>
                          <p className="text-xs text-slate-500">
                            {s.phone || "No phone"} · Last sign-in: {formatWhen(s.lastSignIn)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={s.active ? "active" : "retired"} />
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {assignedRoles.length
                          ? assignedRoles.map((role) => (
                              <RoleBadge key={role.id} role={role.id} roleName={role.name} roleColor={role.color} />
                            ))
                          : assignedIds.map((id) => <RoleBadge key={id} role={id} />)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Can permission="users.edit">
                          <button type="button" onClick={() => openEditUser(s)} className={btnPrimary}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setActive(s, !s.active)}
                            className={btnSecondary}
                            disabled={isSelf || (s.active && isLastOwner)}
                            title={
                              isSelf
                                ? "You cannot deactivate yourself"
                                : s.active && isLastOwner
                                  ? "Cannot deactivate the last Founder"
                                  : undefined
                            }
                          >
                            {s.active ? "Deactivate" : "Activate"}
                          </button>
                        </Can>
                        <Can permission="users.delete">
                          <button
                            type="button"
                            onClick={() => remove(s.id, s.email)}
                            className={btnDanger}
                            disabled={isSelf || isLastOwner}
                            title={
                              isSelf
                                ? "You cannot delete yourself"
                                : isLastOwner
                                  ? "Cannot delete the last Founder"
                                  : `Delete ${s.email}`
                            }
                            aria-label={`Delete ${s.email}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Can>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
