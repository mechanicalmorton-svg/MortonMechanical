import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { loadPaymentSettings, savePaymentSettings } from "@/lib/payment-settings";
import { formatUsdFromCents, isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  return withPermission("payments.view", async () => {
    const settings = await loadPaymentSettings();
    return NextResponse.json({
      ...settings,
      bookingDepositLabel: formatUsdFromCents(settings.bookingDepositCents),
      stripeConfigured: isStripeConfigured(),
    });
  });
}

export async function PATCH(req: Request) {
  return withPermission("payments.manage", async () => {
    const body = await req.json();
    let bookingDepositCents = Number(body.bookingDepositCents);

    if (body.bookingDepositDollars != null && body.bookingDepositCents == null) {
      const dollars = Number(body.bookingDepositDollars);
      if (!Number.isFinite(dollars) || dollars < 0) {
        return NextResponse.json({ error: "Enter a valid deposit amount." }, { status: 400 });
      }
      bookingDepositCents = Math.round(dollars * 100);
    }

    if (!Number.isFinite(bookingDepositCents) || bookingDepositCents < 0) {
      return NextResponse.json({ error: "Enter a valid deposit amount in cents." }, { status: 400 });
    }
    if (bookingDepositCents > 500_000) {
      return NextResponse.json({ error: "Deposit cannot exceed $5,000." }, { status: 400 });
    }

    const before = await loadPaymentSettings();
    const settings = await savePaymentSettings({ bookingDepositCents: Math.round(bookingDepositCents) });
    const { writeAuditEvent } = await import("@/lib/audit-log");
    void writeAuditEvent({
      module: "settings",
      action: "settings_updated",
      description: "Payment settings updated",
      recordType: "settings",
      recordId: "payment-settings",
      recordLabel: "Payment settings",
      oldValue: before,
      newValue: settings,
      page: "/admin#settings",
    });
    return NextResponse.json({
      ...settings,
      bookingDepositLabel: formatUsdFromCents(settings.bookingDepositCents),
      stripeConfigured: isStripeConfigured(),
    });
  });
}
