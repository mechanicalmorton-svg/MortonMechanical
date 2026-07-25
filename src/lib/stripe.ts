import Stripe from "stripe";

/** Stable production domain for this Vercel project. */
const PRODUCTION_SITE_URL = "https://morton-mechanical.vercel.app";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return PRODUCTION_SITE_URL;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripePublishableConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
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
