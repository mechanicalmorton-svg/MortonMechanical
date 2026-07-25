import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { markBookingDepositPaid, markWorkOrderInvoicePaid } from "@/lib/shop-data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const type = session.metadata?.type;
  const sessionId = session.id;

  try {
    if (type === "deposit") {
      const bookingId = session.metadata?.bookingId?.trim();
      if (!bookingId) {
        console.warn("[stripe/webhook] deposit session missing bookingId", sessionId);
        return NextResponse.json({ received: true, ignored: true });
      }
      await markBookingDepositPaid(bookingId, sessionId);
      return NextResponse.json({ received: true, type: "deposit", bookingId });
    }

    if (type === "invoice") {
      const workOrderId = session.metadata?.workOrderId?.trim();
      if (!workOrderId) {
        console.warn("[stripe/webhook] invoice session missing workOrderId", sessionId);
        return NextResponse.json({ received: true, ignored: true });
      }
      await markWorkOrderInvoicePaid(workOrderId, sessionId);
      return NextResponse.json({ received: true, type: "invoice", workOrderId });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (err) {
    console.error("[stripe/webhook] Failed to apply payment", err);
    return NextResponse.json({ error: "Failed to update payment status." }, { status: 500 });
  }
}
