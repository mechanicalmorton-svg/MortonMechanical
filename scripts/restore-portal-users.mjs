/**
 * Restore portal users in Supabase Auth + staff table.
 * Usage: node scripts/restore-portal-users.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(".env.local", "utf8");
    const match = env.match(new RegExp(`^${name}=(.+)$`, "m"));
    return match?.[1]?.trim().replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

const url = loadEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = loadEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const USERS = [
  { email: "adean@mortonsmechanical.com", name: "A Dean", role: "owner" },
  { email: "kstroud@mortonsmechanical.com", name: "K Stroud", role: "owner" },
];

const TEMP_PASSWORD = "MortonPortal2026!";

async function listAuthUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 100) break;
    page += 1;
  }
  return users;
}

async function ensureUser({ email, name, role }) {
  const existing = (await listAuthUsers()).find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let user = existing;
  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    user = data.user;
    console.log(`Created auth user: ${email}`);
  } else {
    const { error } = await sb.auth.admin.updateUserById(user.id, {
      ban_duration: "none",
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    console.log(`Auth user already exists: ${email}`);
  }

  const { error: staffError } = await sb.from("staff").upsert({
    id: user.id,
    auth_user_id: user.id,
    name,
    email,
    phone: "",
    role,
    active: true,
    created_at: user.created_at,
  });
  if (staffError) throw new Error(`${email} staff: ${staffError.message}`);
  console.log(`Synced staff record: ${email} (${role})`);
}

async function main() {
  for (const user of USERS) {
    await ensureUser(user);
  }
  console.log("\nDone. Temporary password for any newly created users:");
  console.log(TEMP_PASSWORD);
  console.log("Ask users to change it after signing in (Site Settings or Supabase dashboard).");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
