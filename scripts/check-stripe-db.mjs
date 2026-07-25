import fs from "fs";

let raw = fs.readFileSync(".env.local", "utf8");
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("missing supabase env");
  process.exit(1);
}

async function check(label, path) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  const text = await r.text();
  console.log(`${label} status=${r.status} body=${text.slice(0, 400)}`);
}

await check(
  "wo_payment",
  "work_orders?select=id,payment_status,stripe_checkout_session_id&limit=1",
);
await check(
  "bk_deposit",
  "bookings?select=id,deposit_paid,stripe_checkout_session_id&limit=1",
);
await check("wo_basic", "work_orders?select=id&limit=1");
