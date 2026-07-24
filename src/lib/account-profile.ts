import { updatePassword } from "./auth";
import { isJwtKeyError, sanitizeAuthError } from "./auth-errors";
import { getPublishableKey, getSupabaseAdmin, getSupabaseUrl, isSupabaseAuthConfigured } from "./supabase/server";
import { createAuthServerClient, isAllowedAdminEmail } from "./supabase/server-auth";
import { createClient } from "@supabase/supabase-js";
import type { StaffRole } from "./shop-types";

function friendlyAuthAdminError(message: string | undefined, fallback: string) {
  return sanitizeAuthError(message, fallback);
}

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  avatarUrl?: string;
  usesSupabaseAuth: boolean;
};

const AVATAR_BUCKET = "avatars";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Stable production domain for this Vercel project — do not change. */
const PRODUCTION_SITE_URL = "https://morton-mechanical.vercel.app";

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  // Production always uses the project domain, never a per-deployment *.vercel.app URL.
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return PRODUCTION_SITE_URL;
}

function avatarExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

async function loadStaffRow(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: byId } = await admin.from("staff").select("*").eq("id", userId).maybeSingle();
  if (byId) return byId;

  const { data: byAuth } = await admin.from("staff").select("*").eq("auth_user_id", userId).maybeSingle();
  return byAuth;
}

async function upsertStaffProfile(userId: string, patch: Record<string, unknown>) {
  const admin = getSupabaseAdmin()!;
  const existing = await loadStaffRow(userId);
  const base = existing ?? {
    id: userId,
    auth_user_id: userId,
    name: "Portal User",
    email: "",
    phone: "",
    role: "mechanic",
    active: true,
    created_at: new Date().toISOString(),
  };

  const { error } = await admin.from("staff").upsert({ ...base, ...patch, id: base.id, auth_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function getAccountProfile(userId: string, fallback?: Partial<AccountProfile>): Promise<AccountProfile> {
  if (!isSupabaseAuthConfigured()) {
    return {
      id: userId,
      name: fallback?.name ?? "Admin",
      email: fallback?.email ?? fallback?.name ?? "",
      phone: "",
      role: fallback?.role ?? "owner",
      usesSupabaseAuth: false,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database is not configured.");

  const staff = await loadStaffRow(userId);
  let authEmail: string | undefined;
  let authPhone = "";
  let metadata: Record<string, unknown> = {};

  try {
    const { data: authUser, error } = await admin.auth.admin.getUserById(userId);
    if (error) throw new Error(error.message);
    authEmail = authUser.user?.email;
    authPhone = authUser.user?.phone || "";
    metadata = authUser.user?.user_metadata ?? {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // Staff-table fallback when Auth Admin JWT signing keys are misconfigured.
    if (!isJwtKeyError(message)) {
      throw new Error(friendlyAuthAdminError(message, "User not found."));
    }
  }

  const email =
    authEmail ||
    (typeof staff?.email === "string" ? staff.email : undefined) ||
    fallback?.email ||
    "";
  if (!email) throw new Error(friendlyAuthAdminError(undefined, "User not found."));

  return {
    id: userId,
    name:
      (staff?.name as string | undefined) ||
      (typeof metadata.full_name === "string" ? metadata.full_name : undefined) ||
      fallback?.name ||
      email.split("@")[0],
    email,
    phone: (staff?.phone as string | undefined) || authPhone || "",
    role: ((staff?.role as StaffRole | undefined) || fallback?.role || "mechanic") as StaffRole,
    avatarUrl:
      (staff?.avatar_url as string | undefined) ||
      (typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined),
    usesSupabaseAuth: true,
  };
}

export async function updateAccountProfile(
  userId: string,
  patch: { name?: string; email?: string; phone?: string },
) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Profile editing is only available with Supabase sign-in.");
  }

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database is not configured.");

  const current = await getAccountProfile(userId);
  const nextName = patch.name?.trim() || current.name;
  const nextPhone = patch.phone !== undefined ? patch.phone.trim() : current.phone;
  const nextEmail = patch.email?.trim().toLowerCase() || current.email;

  if (patch.email && !isAllowedAdminEmail(nextEmail)) {
    throw new Error("Only @mortonsmechanical.com email addresses are allowed.");
  }

  const { data: authUser, error: loadError } = await admin.auth.admin.getUserById(userId);
  if (loadError || !authUser.user) {
    throw new Error(friendlyAuthAdminError(loadError?.message, "User not found."));
  }

  const authPatch: {
    email?: string;
    phone?: string;
    user_metadata?: Record<string, unknown>;
  } = {
    user_metadata: {
      ...(authUser.user.user_metadata ?? {}),
      full_name: nextName,
    },
    phone: nextPhone || undefined,
  };

  if (patch.email && nextEmail !== current.email) {
    authPatch.email = nextEmail;
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ...authPatch,
    email_confirm: true,
  });
  if (authError) throw new Error(friendlyAuthAdminError(authError.message, "Could not update profile."));

  await upsertStaffProfile(userId, {
    name: nextName,
    email: nextEmail,
    phone: nextPhone,
    role: current.role,
    active: true,
  });

  return getAccountProfile(userId);
}

export async function changeAccountPassword(userId: string, password: string, currentPassword?: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  if (isSupabaseAuthConfigured()) {
    const profile = await getAccountProfile(userId);
    if (currentPassword) {
      const url = getSupabaseUrl();
      const key = getPublishableKey();
      if (!url || !key) throw new Error("Auth is not configured.");
      const verifyClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: verifyError } = await verifyClient.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error("Current password is incorrect.");
    }

    // Avoid auth.updateUser() — ES256 tokens without a `kid` fail JWT verification on Auth.
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("Auth is not configured.");
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(friendlyAuthAdminError(error.message, "Could not update password."));
    return;
  }

  await updatePassword(userId, password);
}

export async function sendAccountPasswordReset(email: string) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Password reset email is only available with Supabase sign-in.");
  }
  if (!isAllowedAdminEmail(email)) {
    throw new Error("Only @mortonsmechanical.com email addresses can reset portal access.");
  }

  const supabase = await createAuthServerClient();
  if (!supabase) throw new Error("Auth is not configured.");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/admin/login`,
  });
  if (error) throw new Error(error.message);
}

export async function uploadAccountAvatar(userId: string, file: File | Blob, contentType: string) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Profile photos are only available with Supabase sign-in.");
  }
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database is not configured.");

  const ext = avatarExtension(contentType);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await admin.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrl } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

  const { data: authUser, error: loadError } = await admin.auth.admin.getUserById(userId);
  if (loadError || !authUser.user) {
    throw new Error(friendlyAuthAdminError(loadError?.message, "User not found."));
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(authUser.user.user_metadata ?? {}),
      avatar_url: avatarUrl,
    },
  });
  if (authError) throw new Error(friendlyAuthAdminError(authError.message, "Could not save avatar."));

  await upsertStaffProfile(userId, { avatar_url: avatarUrl });

  return avatarUrl;
}

export async function removeAccountAvatar(userId: string) {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Profile photos are only available with Supabase sign-in.");
  }

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database is not configured.");

  const { data: objects } = await admin.storage.from(AVATAR_BUCKET).list(userId);
  if (objects?.length) {
    const paths = objects.map((item) => `${userId}/${item.name}`);
    await admin.storage.from(AVATAR_BUCKET).remove(paths);
  }

  const profile = await getAccountProfile(userId);
  const { data: authUser, error: loadError } = await admin.auth.admin.getUserById(userId);
  if (loadError || !authUser.user) {
    throw new Error(friendlyAuthAdminError(loadError?.message, "User not found."));
  }

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(authUser.user.user_metadata ?? {}),
      full_name: profile.name,
      avatar_url: null,
    },
  });
  if (authError) throw new Error(friendlyAuthAdminError(authError.message, "Could not remove avatar."));

  await upsertStaffProfile(userId, { avatar_url: null });
}
