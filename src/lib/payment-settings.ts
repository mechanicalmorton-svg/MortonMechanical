import { isDatabaseConfigured, requireAdminClient } from "./supabase/db";

export const DEFAULT_BOOKING_DEPOSIT_CENTS = 5000;

export type PaymentSettings = {
  bookingDepositCents: number;
};

function normalizeSettings(raw: unknown): PaymentSettings {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cents = Number(obj.bookingDepositCents);
  if (!Number.isFinite(cents) || cents < 0) {
    return { bookingDepositCents: DEFAULT_BOOKING_DEPOSIT_CENTS };
  }
  return { bookingDepositCents: Math.round(cents) };
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

export async function loadPaymentSettings(): Promise<PaymentSettings> {
  if (!isDatabaseConfigured()) {
    return { bookingDepositCents: DEFAULT_BOOKING_DEPOSIT_CENTS };
  }
  try {
    const client = requireAdminClient();
    const { data, error } = await client.storage.from("shop-settings").download("payment-settings.json");
    if (error || !data) return { bookingDepositCents: DEFAULT_BOOKING_DEPOSIT_CENTS };
    return normalizeSettings(JSON.parse(await data.text()));
  } catch {
    return { bookingDepositCents: DEFAULT_BOOKING_DEPOSIT_CENTS };
  }
}

export async function savePaymentSettings(settings: PaymentSettings): Promise<PaymentSettings> {
  const next = normalizeSettings(settings);
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not connected.");
  }
  const client = requireAdminClient();
  await ensureShopSettingsBucket();
  const { error } = await client.storage
    .from("shop-settings")
    .upload("payment-settings.json", JSON.stringify(next, null, 2), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
  return next;
}

export async function getBookingDepositCents() {
  const settings = await loadPaymentSettings();
  return settings.bookingDepositCents;
}
