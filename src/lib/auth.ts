import crypto from "node:crypto";
import { readJson, writeJson } from "./store";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase/server";

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;

type Session = { userId: string; expires: number };
type User = { id: string; username: string; passwordHash: string; createdAt: number };

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

// --- JSON fallback (local dev without Supabase) ---

function loadUsersJson(): User[] {
  return readJson("users.json", []);
}

function loadSessionsJson(): Record<string, Session> {
  return readJson("sessions.json", {});
}

function persistSessionsJson(sessions: Record<string, Session>) {
  const now = Date.now();
  for (const [k, s] of Object.entries(sessions)) {
    if (s.expires < now) delete sessions[k];
  }
  writeJson("sessions.json", sessions);
}

// --- Supabase ---

async function loadUsersDb(): Promise<User[]> {
  const sb = getSupabaseAdmin()!;
  const { data } = await sb.from("admin_users").select("id, username, password_hash, created_at");
  return (data ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    passwordHash: u.password_hash,
    createdAt: new Date(u.created_at).getTime(),
  }));
}

async function cleanupExpiredSessions() {
  const sb = getSupabaseAdmin()!;
  await sb.from("admin_sessions").delete().lt("expires_at", new Date().toISOString());
}

export async function isSetupComplete() {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { count } = await sb.from("admin_users").select("*", { count: "exact", head: true });
    return (count ?? 0) > 0;
  }
  return loadUsersJson().length > 0;
}

export async function setupAdmin(username: string, password: string) {
  if (await isSetupComplete()) throw new Error("Setup already completed.");
  if (username.length < 3) throw new Error("Username must be at least 3 characters.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data, error } = await sb
      .from("admin_users")
      .insert({ username, password_hash: hashPassword(password) })
      .select("id, username")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id, username: data.username };
  }

  const user: User = {
    id: Date.now().toString(36),
    username,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  writeJson("users.json", [user]);
  return { id: user.id, username: user.username };
}

export async function login(username: string, password: string) {
  const users = isSupabaseConfigured() ? await loadUsersDb() : loadUsersJson();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_TTL;

  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    await cleanupExpiredSessions();
    await sb.from("admin_sessions").insert({
      token,
      user_id: user.id,
      expires_at: new Date(expires).toISOString(),
    });
  } else {
    const sessions = loadSessionsJson();
    sessions[token] = { userId: user.id, expires };
    persistSessionsJson(sessions);
  }

  return { token, user: { id: user.id, username: user.username } };
}

export async function logout(token: string) {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    await sb.from("admin_sessions").delete().eq("token", token);
  } else {
    const sessions = loadSessionsJson();
    delete sessions[token];
    persistSessionsJson(sessions);
  }
}

export async function getSessionUser(token: string | undefined) {
  if (!token) return null;

  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { data: session } = await sb.from("admin_sessions").select("user_id, expires_at").eq("token", token).maybeSingle();
    if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
    const { data: user } = await sb.from("admin_users").select("id, username").eq("id", session.user_id).maybeSingle();
    return user ? { id: user.id, username: user.username } : null;
  }

  const s = loadSessionsJson()[token];
  if (!s || s.expires < Date.now()) return null;
  const user = loadUsersJson().find((u) => u.id === s.userId);
  return user ? { id: user.id, username: user.username } : null;
}

export async function updatePassword(userId: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");

  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const { error } = await sb.from("admin_users").update({ password_hash: hashPassword(newPassword) }).eq("id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  const users = loadUsersJson();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found.");
  user.passwordHash = hashPassword(newPassword);
  writeJson("users.json", users);
}

export const AUTH_COOKIE = "mm_session";
