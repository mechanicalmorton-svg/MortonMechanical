import { NextResponse } from "next/server";
import { DatabaseError } from "@/lib/supabase/db";
import { getContent } from "@/lib/content";
import { addQuote } from "@/lib/quotes";
import { vehicleLabel } from "@/lib/quote-vehicle";
import { createId, findOrCreateCustomer, upsertBooking } from "@/lib/shop-data";
import type { Booking } from "@/lib/shop-types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content = await getContent();

    if (!body.name?.trim()) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!body.phone?.trim()) return NextResponse.json({ error: "Please enter your phone." }, { status: 400 });
    if (!body.email?.trim()) return NextResponse.json({ error: "Please enter your email." }, { status: 400 });
    if (!body.rego?.trim()) {
      return NextResponse.json({ error: "Please enter your license plate." }, { status: 400 });
    }
    if (!body.consent) return NextResponse.json({ error: "Consent is required." }, { status: 400 });

    const name = String(body.name).trim();
    const phone = String(body.phone).trim();
    const email = String(body.email).trim();
    const service = body.service || content.serviceOptions[0];
    const message = body.message ? String(body.message).trim() : "";
    const rego = String(body.rego).trim();
    const vehicleYear = body.vehicleYear ? String(body.vehicleYear).trim() : "";
    const vehicleMake = body.vehicleMake ? String(body.vehicleMake).trim() : "";
    const vehicleModel = body.vehicleModel ? String(body.vehicleModel).trim() : "";

    const quote = await addQuote({
      name,
      phone,
      email,
      rego,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      service,
      contactMethod: body.contactMethod || "phone",
      message,
    });
    const car = vehicleLabel(quote);

    // Also create a real pending booking linked to a customer record so Bookings uses live data.
    const customer = await findOrCreateCustomer({ name, phone, email });
    const booking: Booking = {
      id: createId(),
      customerId: customer.id,
      quoteId: quote.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      service,
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
      status: "pending",
      depositPaid: false,
      notes:
        [car ? `Vehicle: ${car}` : "", rego ? `License plate: ${rego}` : "", message]
          .filter(Boolean)
          .join("\n") || undefined,
      createdAt: new Date().toISOString(),
    };
    await upsertBooking(booking);

    // Quotes are free — any deposit is collected later from the booking, not at request time.
    return NextResponse.json({ ok: true, quoteId: quote.id, bookingId: booking.id });
  } catch (err) {
    const message =
      err instanceof DatabaseError
        ? "Our booking system is temporarily unavailable. Please call us directly."
        : "Could not save your request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
