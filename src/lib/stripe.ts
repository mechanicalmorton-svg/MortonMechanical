import Stripe from "stripe";

/** Stable production domain for this Vercel project. */
const PRODUCTION_SITE_URL = "https://morton-mechanical.vercel.app";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return PRODUCTION_SITE_URL;
}

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

function stripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey());
}

export function isStripePublishableConfigured() {
  return Boolean(stripePublishableKey());
}

/** `test` | `live` | `unknown` based on the secret key prefix. */
export function getStripeMode(): "test" | "live" | "unknown" {
  const key = stripeSecretKey();
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "unknown";
}

function assertStripeKeyPair() {
  const secret = stripeSecretKey();
  const publishable = stripePublishableKey();
  if (!secret) return;
  if (publishable) {
    const secretTest = secret.startsWith("sk_test_");
    const secretLive = secret.startsWith("sk_live_");
    const pubTest = publishable.startsWith("pk_test_");
    const pubLive = publishable.startsWith("pk_live_");
    if ((secretTest && pubLive) || (secretLive && pubTest)) {
      throw new Error(
        "Stripe key mismatch: STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must both be test or both be live.",
      );
    }
  }
}

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

export function getStripe() {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  assertStripeKeyPair();
  if (!stripeClient || stripeClientKey !== key) {
    stripeClient = new Stripe(key);
    stripeClientKey = key;
  }
  return stripeClient;
}

/** Convert dollars (number or string) to integer cents for Stripe. */
export function dollarsToCents(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid dollar amount.");
  }
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number) {
  return cents / 100;
}

export function formatUsdFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(centsToDollars(cents));
}
