import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { getBookingDepositCents } from "@/lib/payment-settings";
import { formatUsdFromCents, isStripeConfigured } from "@/lib/stripe";
import { requireAdminClient } from "@/lib/supabase/db";

export async function GET() {
  return withPermission("payments.view", async () => {
    const stripeConfigured = isStripeConfigured();
    const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
    const depositCents = await getBookingDepositCents();

    let workOrderPaymentsReady = false;
    let bookingDepositsReady = false;
    let dbMessage = "";

    try {
      const client = requireAdminClient();
      const wo = await client.from("work_orders").select("id, payment_status").limit(1);
      const bk = await client.from("bookings").select("id, deposit_paid").limit(1);

      if (wo.error) {
        dbMessage = wo.error.message;
        workOrderPaymentsReady = false;
      } else {
        workOrderPaymentsReady = true;
      }

      if (bk.error) {
        dbMessage = dbMessage || bk.error.message;
        bookingDepositsReady = false;
      } else {
        bookingDepositsReady = true;
      }
    } catch (err) {
      dbMessage = err instanceof Error ? err.message : "Database check failed.";
    }

    const ready = stripeConfigured && webhookConfigured && workOrderPaymentsReady && bookingDepositsReady;

    return NextResponse.json({
      ready,
      stripeConfigured,
      webhookConfigured,
      workOrderPaymentsReady,
      bookingDepositsReady,
      bookingDepositCents: depositCents,
      bookingDepositLabel: formatUsdFromCents(depositCents),
      dbMessage: dbMessage || undefined,
      sqlHint:
        !workOrderPaymentsReady || !bookingDepositsReady
          ? "Run supabase/add-stripe-payments.sql in the Supabase SQL editor."
          : undefined,
    });
  });
}
