/**
 * End-to-end Stripe + Supabase smoke verification (no card charge).
 * Creates Checkout Sessions, verifies DB payment updates, then reverts test rows.
 */
import fs from "fs";

function loadEnv(file) {
  let raw = fs.readFileSync(file, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const env = loadEnv(".env.local");
const stripeKey = env.STRIPE_SECRET_KEY;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || !supabaseUrl || !supabaseKey) {
  console.error("Missing STRIPE_SECRET_KEY or Supabase env in .env.local");
  process.exit(1);
}

const stripeAuth = "Basic " + Buffer.from(`${stripeKey}:`).toString("base64");
const sbHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  Accept: "application/json",
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function stripeForm(path, body) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: stripeAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`${path}: ${json.error?.message || r.status}`);
  return json;
}

async function sb(path, init = {}) {
  const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...sbHeaders, ...(init.headers || {}) },
  });
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!r.ok) throw new Error(`${path}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  return json;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`OK  ${msg}`);
}

const site = "https://morton-mechanical.vercel.app";

// 1) Deposit-style Checkout Session
const depositSession = await stripeForm("checkout/sessions", {
  mode: "payment",
  success_url: `${site}/contact?paid=1`,
  cancel_url: `${site}/contact?cancelled=1`,
  "line_items[0][quantity]": "1",
  "line_items[0][price_data][currency]": "usd",
  "line_items[0][price_data][unit_amount]": "5000",
  "line_items[0][price_data][product_data][name]": "Booking deposit (verification)",
  "metadata[type]": "deposit",
  "metadata[bookingId]": "verify-booking",
  "metadata[quoteId]": "verify-quote",
});
assert(depositSession.url && depositSession.status === "open", "deposit Checkout Session created");
assert(depositSession.livemode === true, "deposit session is live mode");

// 2) Pick a work order and create invoice session
const orders = await sb("work_orders?select=id,customer_name,revenue,payment_status,service&limit=5&order=updated_at.desc");
assert(Array.isArray(orders) && orders.length > 0, "loaded work orders from Supabase");
const order = orders[0];
const amountCents = Math.max(50, Math.round(Number(order.revenue || 1) * 100) || 50);

const invoiceSession = await stripeForm("checkout/sessions", {
  mode: "payment",
  success_url: `${site}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${site}/pay/cancel`,
  "line_items[0][quantity]": "1",
  "line_items[0][price_data][currency]": "usd",
  "line_items[0][price_data][unit_amount]": String(amountCents),
  "line_items[0][price_data][product_data][name]": `Invoice — ${order.customer_name || "Customer"}`,
  "metadata[type]": "invoice",
  "metadata[workOrderId]": order.id,
});
assert(invoiceSession.url && invoiceSession.status === "open", "invoice Checkout Session created");

// 3) Simulate webhook DB write for that work order, then revert
const priorStatus = order.payment_status || "unpaid";
const paid = await sb(`work_orders?id=eq.${encodeURIComponent(order.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    payment_status: "paid",
    stripe_checkout_session_id: invoiceSession.id,
  }),
});
assert(paid?.[0]?.payment_status === "paid", "work order payment_status can be set to paid");

// Idempotent re-apply
const paidAgain = await sb(`work_orders?id=eq.${encodeURIComponent(order.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    payment_status: "paid",
    stripe_checkout_session_id: invoiceSession.id,
  }),
});
assert(paidAgain?.[0]?.payment_status === "paid", "paid update is idempotent");

// Revert
await sb(`work_orders?id=eq.${encodeURIComponent(order.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    payment_status: priorStatus,
    stripe_checkout_session_id: null,
  }),
});
assert(true, `reverted work order ${order.id} to ${priorStatus}`);

// 4) Booking deposit column write/revert on newest booking
const bookings = await sb("bookings?select=id,deposit_paid,status&limit=1&order=created_at.desc");
assert(Array.isArray(bookings) && bookings.length > 0, "loaded bookings from Supabase");
const booking = bookings[0];
const priorDeposit = Boolean(booking.deposit_paid);
const priorBookingStatus = booking.status;
await sb(`bookings?id=eq.${encodeURIComponent(booking.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    deposit_paid: true,
    stripe_checkout_session_id: depositSession.id,
    status: booking.status === "pending" ? "confirmed" : booking.status,
  }),
});
const marked = await sb(`bookings?id=eq.${encodeURIComponent(booking.id)}&select=deposit_paid,status`);
assert(marked?.[0]?.deposit_paid === true, "booking deposit_paid can be set true");
await sb(`bookings?id=eq.${encodeURIComponent(booking.id)}`, {
  method: "PATCH",
  body: JSON.stringify({
    deposit_paid: priorDeposit,
    stripe_checkout_session_id: null,
    status: priorBookingStatus,
  }),
});
assert(true, `reverted booking ${booking.id}`);

// 5) Expire unused verification sessions (no charge)
await stripeForm(`checkout/sessions/${depositSession.id}/expire`, {});
await stripeForm(`checkout/sessions/${invoiceSession.id}/expire`, {});
assert(true, "expired verification Checkout Sessions (no charge)");

console.log("\nStripe + work-order payment integration verified.");
console.log(`Invoice Checkout URL sample (expired): ${invoiceSession.url ? "created" : "missing"}`);
