import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { loadWorkOrders, markWorkOrderInvoicePaid } from "@/lib/shop-data";

/**
 * Checks open Stripe Checkout sessions for unpaid work-order invoices
 * and marks them paid when Checkout is complete.
 */
export async function POST() {
  return withPermission(["payments.view", "work_orders.view"], async () => {
    if (!isStripeConfigured()) {
      return NextResponse.json({ synced: 0, stripeConfigured: false });
    }

    const orders = await loadWorkOrders();
    const pending = orders.filter(
      (order) => (order.paymentStatus ?? "unpaid") !== "paid" && Boolean(order.stripeCheckoutSessionId),
    );

    if (!pending.length) {
      return NextResponse.json({ synced: 0, checked: 0 });
    }

    const stripe = getStripe();
    const paidIds: string[] = [];

    for (const order of pending) {
      const sessionId = order.stripeCheckoutSessionId!.trim();
      if (!sessionId.startsWith("cs_")) continue;
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paid =
          session.payment_status === "paid" ||
          session.status === "complete" ||
          session.payment_status === "no_payment_required";
        if (!paid) continue;
        const workOrderId = session.metadata?.workOrderId?.trim() || order.id;
        await markWorkOrderInvoicePaid(workOrderId, session.id);
        paidIds.push(workOrderId);
      } catch (err) {
        console.warn("[payments/sync-pending] session check failed", sessionId, err);
      }
    }

    return NextResponse.json({ synced: paidIds.length, checked: pending.length, paidIds });
  });
}
