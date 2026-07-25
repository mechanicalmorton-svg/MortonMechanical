import { createClient } from "@supabase/supabase-js";
import { isJwtKeyError, sanitizeAuthError } from "./auth-errors";
import { normalizeRoleIds, pickPrimaryRoleId } from "./role-definitions";
import { getSupabaseAdmin, getPublishableKey, getSupabaseUrl, isSupabaseConfigured } from "./supabase/server";
import { throwOnError } from "./supabase/db";
import { isAllowedAdminEmail } from "./supabase/server-auth";
import type { StaffMember, StaffRole } from "./shop-types";

function emailToDisplayName(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function friendlyAuthAdminError(message: string | undefined, fallback: string) {
  return sanitizeAuthError(message, fallback);
}

function isMissingRoleIdsColumn(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("role_ids") &&
    (lower.includes("schema cache") ||
      lower.includes("could not find") ||
      lower.includes("does not exist") ||
      lower.includes("column"))
  );
}

function roleIdsFromRow(r: Record<string, unknown>): string[] {
  return normalizeRoleIds(r.role_ids, r.role);
}

function rowToStaffRecord(r: Record<string, unknown>) {
  const roleIds = roleIdsFromRow(r);
  const role = (pickPrimaryRoleId(roleIds) || (r.role as string) || "mechanic") as StaffRole;
  return {
    id: r.id as string,
    authUserId: (r.auth_user_id as string | undefined) ?? (r.id as string),
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string) ?? "",
    role,
    roleIds,
    active: Boolean(r.active),
    createdAt: r.created_at as string,
  };
}

async function listAuthUsers() {
  const sb = getSupabaseAdmin()!;
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      // Surface as a normal Error so callers can fall back on JWT-signing misconfig.
      throw new Error(error.message);
    }
    users.push(...(data.users ?? []).filter((user) => isAllowedAdminEmail(user.email)));
    if ((data.users?.length ?? 0) < 100) break;
    page += 1;
  }

  return users;
}

async function loadStaffFromTable(): Promise<StaffMember[]> {
  const sb = getSupabaseAdmin()!;
  const { data: staffRows, error } = await sb.from("staff").select("*").order("name");
  throwOnError(error, "Could not load staff");
  return (staffRows ?? [])
    .map((row) => {
      const record = rowToStaffRecord(row);
      return {
        ...record,
        lastSignIn: null as string | null,
      };
    })
    .filter((member) => isAllowedAdminEmail(member.email))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function staffToRow(member: StaffMember, includeRoleIds = true) {
  const roleIds = normalizeRoleIds(member.roleIds, member.role);
  const role = pickPrimaryRoleId(roleIds);
  const row: Record<string, unknown> = {
    id: member.id,
    auth_user_id: member.authUserId ?? member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    role,
    active: member.active,
    created_at: member.createdAt,
  };
  if (includeRoleIds) row.role_ids = roleIds;
  return row;
}

export const ROLE_IDS_SQL =
  "alter table staff add column if not exists role_ids text[]; update staff set role_ids = array[role] where (role_ids is null or cardinality(role_ids) = 0) and role is not null and btrim(role) <> ''; notify pgrst, 'reload schema';";

export async function staffMultiRoleReady(): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("staff").select("id, role_ids").limit(1);
  if (!error) return true;
  return !isMissingRoleIdsColumn(error.message);
}

async function upsertStaffRow(member: StaffMember) {
  const sb = getSupabaseAdmin()!;
  const roleIds = normalizeRoleIds(member.roleIds, member.role);
  const withIds = staffToRow({ ...member, roleIds }, true);
  const { error } = await sb.from("staff").upsert(withIds);
  if (error && isMissingRoleIdsColumn(error.message)) {
    if (roleIds.length > 1) {
      throw new Error(
        "Multi-role assignment needs the staff.role_ids column. Run supabase/add-staff-role-ids.sql in the Supabase SQL editor, then try again.",
      );
    }
    const { error: fallbackError } = await sb.from("staff").upsert(staffToRow(member, false));
    throwOnError(fallbackError, "Could not save staff record");
    return;
  }
  throwOnError(error, "Could not save staff record");
}

export async function loadStaffFromAuth(): Promise<StaffMember[]> {
  if (!isSupabaseConfigured()) return [];

  const sb = getSupabaseAdmin()!;

  try {
    const authUsers = await listAuthUsers();
    const { data: staffRows } = await sb.from("staff").select("*");
    const byAuthId = new Map<string, ReturnType<typeof rowToStaffRecord>>();
    const byEmail = new Map<string, ReturnType<typeof rowToStaffRecord>>();

    for (const row of staffRows ?? []) {
      const record = rowToStaffRecord(row);
      if (record.authUserId) byAuthId.set(record.authUserId, record);
      byEmail.set(record.email.toLowerCase(), record);
    }

    const members: StaffMember[] = [];

    for (const user of authUsers) {
      const email = user.email!.toLowerCase();
      const existing = byAuthId.get(user.id) ?? byEmail.get(email);
      const roleIds = normalizeRoleIds(existing?.roleIds, existing?.role || "mechanic");
      const member: StaffMember = {
        id: user.id,
        authUserId: user.id,
        name: existing?.name || (user.user_metadata?.full_name as string | undefined) || emailToDisplayName(email),
        email: user.email!,
        phone: existing?.phone || user.phone || "",
        role: pickPrimaryRoleId(roleIds) as StaffRole,
        roleIds,
        active: existing?.active ?? !user.banned_until,
        createdAt: existing?.createdAt || user.created_at,
        lastSignIn: user.last_sign_in_at ?? null,
      };

      if (!existing || existing.authUserId !== user.id || existing.id !== user.id) {
        await upsertStaffRow(member);
      }

      members.push(member);
    }

    return members.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (isJwtKeyError(message)) {
      console.warn("[staff-auth] Auth admin API unavailable (JWT signing key issue). Falling back to staff table.");
      return loadStaffFromTable();
    }
    // Prefer staff-table listing over hard-failing User Management when Auth Admin flakes.
    console.warn("[staff-auth] Auth admin list failed; falling back to staff table.", message);
    try {
      return await loadStaffFromTable();
    } catch {
      throw error;
    }
  }
}

export async function createPortalUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: StaffRole;
  roleIds?: StaffRole[];
}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  if (!isAllowedAdminEmail(input.email)) {
    throw new Error("Only @mortonsmechanical.com email addresses can be added.");
  }
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");

  const roleIds = normalizeRoleIds(input.roleIds, input.role ?? "mechanic");
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name.trim() },
    app_metadata: { portal: "staff" },
    phone: input.phone?.trim() || undefined,
  });
  if (error || !data.user) {
    throw new Error(friendlyAuthAdminError(error?.message, "Could not create user."));
  }

  const member: StaffMember = {
    id: data.user.id,
    authUserId: data.user.id,
    name: input.name.trim(),
    email: data.user.email!,
    phone: input.phone?.trim() || "",
    role: pickPrimaryRoleId(roleIds) as StaffRole,
    roleIds,
    active: true,
    createdAt: data.user.created_at,
    lastSignIn: null,
  };

  await upsertStaffRow(member);
  return member;
}

export function memberHasOwnerRole(member: Pick<StaffMember, "role" | "roleIds">) {
  return normalizeRoleIds(member.roleIds, member.role).includes("owner");
}

/** Shared guards for delete / deactivate / demote of Founder accounts. */
export function assertStaffMutationAllowed(
  actorId: string,
  target: StaffMember,
  allMembers: StaffMember[],
  next: { active?: boolean; roleIds?: string[]; role?: string; deleting?: boolean },
) {
  const otherActiveOwners = allMembers.filter(
    (member) => member.id !== target.id && member.active && memberHasOwnerRole(member),
  );
  const isLastActiveOwner = target.active && memberHasOwnerRole(target) && otherActiveOwners.length === 0;

  if (next.deleting || next.active === false) {
    if (target.id === actorId) {
      throw new Error("You cannot deactivate or delete your own account.");
    }
    if (isLastActiveOwner) {
      throw new Error("Cannot remove the last Founder account.");
    }
  }

  if (next.roleIds !== undefined || next.role !== undefined) {
    const nextRoleIds = normalizeRoleIds(next.roleIds, next.role ?? target.role);
    const nextHasOwner = nextRoleIds.includes("owner");
    if (isLastActiveOwner && !nextHasOwner) {
      throw new Error("Cannot remove the Founder role from the last Founder.");
    }
  }
}

export async function updatePortalUser(
  id: string,
  patch: Partial<Pick<StaffMember, "name" | "email" | "phone" | "role" | "roleIds" | "active">> & {
    password?: string;
  },
) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

  const sb = getSupabaseAdmin()!;
  const members = await loadStaffFromAuth();
  const member = members.find((item) => item.id === id);
  if (!member) throw new Error("User not found.");

  const nextRoleIds =
    patch.roleIds !== undefined
      ? normalizeRoleIds(patch.roleIds, patch.role ?? member.role)
      : patch.role !== undefined
        ? normalizeRoleIds([patch.role], patch.role)
        : normalizeRoleIds(member.roleIds, member.role);

  const nextName = patch.name !== undefined ? patch.name.trim() : member.name;
  if (!nextName) throw new Error("Name is required.");

  const nextEmail =
    patch.email !== undefined ? patch.email.trim().toLowerCase() : member.email.toLowerCase();
  if (patch.email !== undefined) {
    if (!nextEmail) throw new Error("Email is required.");
    if (!isAllowedAdminEmail(nextEmail)) {
      throw new Error("Only @mortonsmechanical.com email addresses can be used.");
    }
  }

  const nextPhone = patch.phone !== undefined ? patch.phone.trim() : member.phone;
  const nextActive = patch.active !== undefined ? Boolean(patch.active) : member.active;
  const nextPassword = typeof patch.password === "string" ? patch.password : undefined;
  if (nextPassword !== undefined && nextPassword.length > 0 && nextPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const updated: StaffMember = {
    ...member,
    name: nextName,
    email: nextEmail,
    phone: nextPhone,
    active: nextActive,
    roleIds: nextRoleIds,
    role: pickPrimaryRoleId(nextRoleIds) as StaffRole,
  };

  const authPatch: {
    email?: string;
    phone?: string;
    password?: string;
    ban_duration?: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, unknown>;
  } = {};

  if (patch.active !== undefined && nextActive !== member.active) {
    authPatch.ban_duration = nextActive ? "none" : "876000h";
  }
  if (patch.name !== undefined && nextName !== member.name) {
    authPatch.user_metadata = { full_name: nextName };
  }
  if (patch.email !== undefined && nextEmail !== member.email.toLowerCase()) {
    authPatch.email = nextEmail;
    authPatch.email_confirm = true;
  }
  if (patch.phone !== undefined && nextPhone !== member.phone) {
    authPatch.phone = nextPhone || undefined;
  }
  if (nextPassword) {
    authPatch.password = nextPassword;
  }

  if (Object.keys(authPatch).length) {
    const { data: existingAuth } = await sb.auth.admin.getUserById(id);
    if (authPatch.user_metadata) {
      authPatch.user_metadata = {
        ...(existingAuth.user?.user_metadata ?? {}),
        ...authPatch.user_metadata,
      };
    }
    const { error } = await sb.auth.admin.updateUserById(id, authPatch);
    if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not update user."));
  }

  await upsertStaffRow(updated);
  return updated;
}

export async function deletePortalUser(id: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

  const sb = getSupabaseAdmin()!;
  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not delete user."));
  const { error: deleteError } = await sb.from("staff").delete().eq("id", id);
  throwOnError(deleteError, "Could not remove staff record");
}

/** Password check without attaching any existing browser/session JWT. */
export async function verifyEmailPassword(email: string, password: string) {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) throw new Error("Auth is not configured.");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    if (isJwtKeyError(error?.message)) {
      throw new Error(friendlyAuthAdminError(error?.message, "Sign-in failed."));
    }
    return null;
  }
  return data;
}
