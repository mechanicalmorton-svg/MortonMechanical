import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { dollarsToCents, getSiteUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { getCustomerById, loadWorkOrders, upsertWorkOrder } from "@/lib/shop-data";

export async function POST(req: Request) {
  return withPermission("payments.manage", async () => {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in the environment." },
        { status: 503 },
      );
    }

    const body = await req.json();
    const workOrderId = String(body.workOrderId ?? "").trim();
    if (!workOrderId) {
      return NextResponse.json({ error: "workOrderId is required." }, { status: 400 });
    }

    const orders = await loadWorkOrders();
    const order = orders.find((item) => item.id === workOrderId);
    if (!order) {
      return NextResponse.json({ error: "Work order not found." }, { status: 404 });
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "This work order is already paid." }, { status: 400 });
    }

    const revenue = Number(order.revenue ?? 0);
    if (!Number.isFinite(revenue) || revenue <= 0) {
      return NextResponse.json({ error: "Set a Total charge greater than $0 before creating a Pay Now link." }, { status: 400 });
    }

    const amountCents = dollarsToCents(revenue);
    const siteUrl = getSiteUrl();
    const stripe = getStripe();

    let customerEmail: string | undefined;
    if (order.customerId) {
      try {
        const customer = await getCustomerById(order.customerId);
        const email = customer?.email?.trim();
        if (email) customerEmail = email;
      } catch {
        // Optional — Checkout still works without prefilled email.
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pay/cancel`,
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Invoice — ${order.customerName}`,
              description: order.service.slice(0, 200) || "Work order payment",
            },
          },
        },
      ],
      metadata: {
        type: "invoice",
        workOrderId: order.id,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    }

    await upsertWorkOrder({
      ...order,
      stripeCheckoutSessionId: session.id,
      paymentStatus: order.paymentStatus ?? "unpaid",
      updatedAt: new Date().toISOString(),
    });

    const { writeAuditEvent } = await import("@/lib/audit-log");
    void writeAuditEvent({
      module: "payments",
      action: "payment_link_created",
      description: `Pay Now link created for ${order.customerName}`,
      recordType: "work_order",
      recordId: order.id,
      recordLabel: order.customerName,
      oldValue: { paymentStatus: order.paymentStatus, stripeCheckoutSessionId: order.stripeCheckoutSessionId },
      newValue: { paymentStatus: order.paymentStatus ?? "unpaid", stripeCheckoutSessionId: session.id, amountCents },
      severity: "notice",
      page: "/admin#work-orders",
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amountCents,
    });
  });
}
