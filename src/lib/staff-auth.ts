import { createClient } from "@supabase/supabase-js";
import { isJwtKeyError, sanitizeAuthError } from "./auth-errors";
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

function rowToStaffRecord(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    authUserId: (r.auth_user_id as string | undefined) ?? (r.id as string),
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string) ?? "",
    role: r.role as StaffRole,
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
    if (error) throw new Error(error.message);
    users.push(...data.users.filter((user) => isAllowedAdminEmail(user.email)));
    if (data.users.length < 100) break;
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

function staffToRow(member: StaffMember) {
  return {
    id: member.id,
    auth_user_id: member.authUserId ?? member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    active: member.active,
    created_at: member.createdAt,
  };
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
      const member: StaffMember = {
        id: user.id,
        authUserId: user.id,
        name: existing?.name || (user.user_metadata?.full_name as string | undefined) || emailToDisplayName(email),
        email: user.email!,
        phone: existing?.phone || user.phone || "",
        role: existing?.role || "mechanic",
        active: existing?.active ?? !user.banned_until,
        createdAt: existing?.createdAt || user.created_at,
        lastSignIn: user.last_sign_in_at ?? null,
      };

      if (!existing || existing.authUserId !== user.id || existing.id !== user.id) {
        const { error } = await sb.from("staff").upsert(staffToRow(member));
        throwOnError(error, `Could not sync staff record for ${email}`);
      }

      members.push(member);
    }

    return members.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isJwtKeyError(message)) {
      console.warn("[staff-auth] Auth admin API unavailable (JWT signing key issue). Falling back to staff table.");
      return loadStaffFromTable();
    }
    throw error;
  }
}

export async function createPortalUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: StaffRole;
}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  if (!isAllowedAdminEmail(input.email)) {
    throw new Error("Only @mortonsmechanical.com email addresses can be added.");
  }
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");

  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name.trim() },
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
    role: input.role ?? "mechanic",
    active: true,
    createdAt: data.user.created_at,
    lastSignIn: null,
  };

  const { error: upsertError } = await sb.from("staff").upsert(staffToRow(member));
  throwOnError(upsertError, "Could not save staff record");
  return member;
}

export async function updatePortalUser(
  id: string,
  patch: Partial<Pick<StaffMember, "name" | "phone" | "role" | "active">>,
) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

  const sb = getSupabaseAdmin()!;
  const members = await loadStaffFromAuth();
  const member = members.find((item) => item.id === id);
  if (!member) throw new Error("User not found.");

  const updated: StaffMember = {
    ...member,
    ...patch,
    name: patch.name?.trim() || member.name,
    phone: patch.phone?.trim() ?? member.phone,
  };

  if (patch.active === false) {
    const { error } = await sb.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not deactivate user."));
  } else if (patch.active === true) {
    const { error } = await sb.auth.admin.updateUserById(id, { ban_duration: "none" });
    if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not activate user."));
  }

  if (patch.name) {
    const { error } = await sb.auth.admin.updateUserById(id, {
      user_metadata: { full_name: updated.name },
    });
    if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not update user name."));
  }

  if (patch.phone !== undefined) {
    const { error } = await sb.auth.admin.updateUserById(id, { phone: updated.phone || undefined });
    if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not update user phone."));
  }

  const { error: upsertError } = await sb.from("staff").upsert(staffToRow(updated));
  throwOnError(upsertError, "Could not save staff record");
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
