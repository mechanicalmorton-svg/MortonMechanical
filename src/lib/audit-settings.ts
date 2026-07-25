import { isDatabaseConfigured, requireAdminClient } from "./supabase/db";

/** Retention for a future purge job. `null` = keep forever (v1 default). */
export type AuditSettings = {
  retentionDays: number | null;
};

const DEFAULT_SETTINGS: AuditSettings = { retentionDays: null };
const SETTINGS_PATH = "audit-settings.json";

function normalizeSettings(raw: unknown): AuditSettings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (obj.retentionDays == null) return { retentionDays: null };
  const days = Number(obj.retentionDays);
  if (!Number.isFinite(days) || days < 1) return { retentionDays: null };
  return { retentionDays: Math.round(days) };
}

async function ensureShopSettingsBucket() {
  const client = requireAdminClient();
  const { data: buckets } = await client.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === "shop-settings")) {
    const created = await client.storage.createBucket("shop-settings", {
      public: false,
      fileSizeLimit: 256 * 1024,
    });
    if (created.error && !created.error.message.toLowerCase().includes("already exists")) {
      throw created.error;
    }
  }
}

export async function loadAuditSettings(): Promise<AuditSettings> {
  if (!isDatabaseConfigured()) return { ...DEFAULT_SETTINGS };
  try {
    const client = requireAdminClient();
    const { data, error } = await client.storage.from("shop-settings").download(SETTINGS_PATH);
    if (error || !data) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(await data.text()));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveAuditSettings(settings: Partial<AuditSettings>): Promise<AuditSettings> {
  const current = await loadAuditSettings();
  const next = normalizeSettings({ ...current, ...settings });
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not connected.");
  }
  const client = requireAdminClient();
  await ensureShopSettingsBucket();
  const { error } = await client.storage
    .from("shop-settings")
    .upload(SETTINGS_PATH, JSON.stringify(next, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
  return next;
}
