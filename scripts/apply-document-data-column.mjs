import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [line.slice(0, i).trim(), value];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or secret key in .env.local");
  process.exit(1);
}

const sql =
  "alter table work_orders add column if not exists document_data jsonb default '{}'::jsonb;";

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function tryQuery(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const attempts = [
  [`${url}/pg/query`, { query: sql }],
  [`${url}/pg-meta/default/query`, { query: sql }],
];

for (const [endpoint, body] of attempts) {
  try {
    const result = await tryQuery(endpoint, body);
    console.log("attempt", endpoint.replace(url, ""), result.status, result.text.slice(0, 240));
  } catch (error) {
    console.log("attempt", endpoint.replace(url, ""), "ERR", error.message);
  }
}

const select = await fetch(`${url}/rest/v1/work_orders?select=id,document_data&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const selectText = await select.text();
console.log("select", select.status, selectText.slice(0, 400));

if (select.status === 200) {
  console.log("OK: document_data column is available");
  process.exit(0);
}

console.log("Column still missing — need DB SQL access (run supabase/add-work-order-document-data.sql)");
process.exit(2);
