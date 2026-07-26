import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { markBookingDepositPaid, markWorkOrderInvoicePaid } from "@/lib/shop-data";

export const runtime = "nodejs";

/**
 * Confirms a completed Checkout session and applies payment to the linked record.
 * Used by /pay/success so work orders update even if the webhook is delayed or misconfigured.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  let sessionId = "";
  try {
    const body = await req.json();
    sessionId = String(body.sessionId ?? body.session_id ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[payments/confirm] Could not retrieve session", err);
    return NextResponse.json({ error: "Could not verify payment session." }, { status: 400 });
  }

  const paid =
    session.payment_status === "paid" ||
    session.status === "complete" ||
    session.payment_status === "no_payment_required";

  if (!paid) {
    return NextResponse.json({
      paid: false,
      status: session.status,
      paymentStatus: session.payment_status,
    });
  }

  const type = session.metadata?.type;
  try {
    if (type === "deposit") {
      const bookingId = session.metadata?.bookingId?.trim();
      if (!bookingId) {
        return NextResponse.json({ paid: true, applied: false, reason: "missing_bookingId" });
      }
      const booking = await markBookingDepositPaid(bookingId, session.id);
      return NextResponse.json({ paid: true, applied: true, type: "deposit", bookingId: booking.id });
    }

    if (type === "invoice") {
      const workOrderId = session.metadata?.workOrderId?.trim();
      if (!workOrderId) {
        return NextResponse.json({ paid: true, applied: false, reason: "missing_workOrderId" });
      }
      const order = await markWorkOrderInvoicePaid(workOrderId, session.id);
      return NextResponse.json({
        paid: true,
        applied: true,
        type: "invoice",
        workOrderId: order.id,
        paymentStatus: order.paymentStatus,
      });
    }

    return NextResponse.json({ paid: true, applied: false, reason: "unknown_type" });
  } catch (err) {
    console.error("[payments/confirm] Failed to apply payment", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update payment status." },
      { status: 500 },
    );
  }
}
