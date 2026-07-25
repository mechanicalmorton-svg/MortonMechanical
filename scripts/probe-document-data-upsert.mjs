import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
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
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const list = await fetch(`${url}/rest/v1/work_orders?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const rows = await list.json();
const id = rows[0]?.id;
if (!id) {
  console.log("no work orders to probe");
  process.exit(1);
}

const patch = await fetch(`${url}/rest/v1/work_orders?id=eq.${encodeURIComponent(id)}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    document_data: { viewToken: "probe-token", documents: {} },
  }),
});
const text = await patch.text();
console.log("patch", patch.status, text.slice(0, 500));
