/**
 * Generate SQL to add admin portal users.
 * Usage:
 *   node scripts/generate-admin-sql.mjs alice password123 bob password456
 *
 * Paste the printed SQL into Supabase → SQL Editor → Run
 */
import crypto from "node:crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2 !== 0) {
  console.error("Usage: node scripts/generate-admin-sql.mjs <username> <password> [<username> <password> ...]");
  process.exit(1);
}

console.log("-- Add admin portal users (owners/staff with dashboard login)");
console.log("-- Run in Supabase → SQL Editor\n");

for (let i = 0; i < args.length; i += 2) {
  const username = args[i];
  const password = args[i + 1];
  if (username.length < 3) {
    console.error(`Skip "${username}": username must be at least 3 characters`);
    continue;
  }
  if (password.length < 8) {
    console.error(`Skip "${username}": password must be at least 8 characters`);
    continue;
  }
  const hash = hashPassword(password);
  console.log(
    `INSERT INTO admin_users (username, password_hash)\nVALUES ('${username.replace(/'/g, "''")}', '${hash}')\nON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;\n`,
  );
}

console.log("-- Users can sign in at /admin/login with the username + password you chose above.");
