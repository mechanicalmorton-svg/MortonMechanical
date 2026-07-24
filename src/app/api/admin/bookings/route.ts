import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import {
  createId,
  deleteBooking,
  findOrCreateCustomer,
  getCustomerById,
  loadBookings,
  upsertBooking,
} from "@/lib/shop-data";
import type { Booking, BookingStatus } from "@/lib/shop-types";

function parseStatus(value: unknown): BookingStatus {
  if (value === "confirmed" || value === "completed" || value === "cancelled" || value === "pending") return value;
  return "pending";
}

export async function GET() {
  return withAdminAuth(async () => {
    const items = await loadBookings();
    return NextResponse.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export async function POST(req: Request) {
  return withAdminAuth(async () => {
    try {
      const body = await req.json();
      let customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
      let customerName = String(body.customerName ?? "").trim();
      let phone = String(body.phone ?? "").trim();
      let email = typeof body.email === "string" ? body.email.trim() : "";
      let address = typeof body.address === "string" ? body.address.trim() : "";

      if (customerId) {
        const customer = await getCustomerById(customerId);
        if (!customer) return NextResponse.json({ error: "Selected customer was not found." }, { status: 400 });
        customerName = customer.name;
        phone = customer.phone || phone;
        email = customer.email || email;
        address = customer.address || address;
      } else if (customerName && phone) {
        const customer = await findOrCreateCustomer({ name: customerName, phone, email, address });
        customerId = customer.id;
        customerName = customer.name;
        phone = customer.phone;
        email = customer.email ?? email;
        address = customer.address ?? address;
      }

      if (!customerName || !phone) {
        return NextResponse.json({ error: "Customer name and phone are required." }, { status: 400 });
      }

      const booking: Booking = {
        id: createId(),
        customerId: customerId || undefined,
        quoteId: typeof body.quoteId === "string" ? body.quoteId.trim() || undefined : undefined,
        customerName,
        phone,
        email: email || undefined,
        service: String(body.service ?? "General service").trim() || "General service",
        date: String(body.date ?? new Date().toISOString().slice(0, 10)),
        time: String(body.time ?? "09:00"),
        address: address || undefined,
        status: parseStatus(body.status),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        createdAt: new Date().toISOString(),
      };
      await upsertBooking(booking);
      return NextResponse.json(booking);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not create booking." },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(req: Request) {
  return withAdminAuth(async () => {
    try {
      const body = await req.json();
      const items = await loadBookings();
      const item = items.find((b) => b.id === body.id);
      if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

      let customerId = typeof body.customerId === "string" ? body.customerId.trim() : item.customerId;
      let customerName = typeof body.customerName === "string" ? body.customerName.trim() : item.customerName;
      let phone = typeof body.phone === "string" ? body.phone.trim() : item.phone;
      let email = typeof body.email === "string" ? body.email.trim() : item.email;
      let address = typeof body.address === "string" ? body.address.trim() : item.address;

      if (body.customerId !== undefined && customerId) {
        const customer = await getCustomerById(customerId);
        if (!customer) return NextResponse.json({ error: "Selected customer was not found." }, { status: 400 });
        customerName = customer.name;
        phone = customer.phone || phone;
        email = customer.email || email;
        address = customer.address || address;
      }

      const updated: Booking = {
        ...item,
        customerId: customerId || undefined,
        quoteId: typeof body.quoteId === "string" ? body.quoteId.trim() || undefined : item.quoteId,
        customerName,
        phone,
        email: email || undefined,
        service: typeof body.service === "string" ? body.service.trim() || item.service : item.service,
        date: typeof body.date === "string" ? body.date : item.date,
        time: typeof body.time === "string" ? body.time : item.time,
        address: address || undefined,
        status: body.status ? parseStatus(body.status) : item.status,
        notes: typeof body.notes === "string" ? body.notes : item.notes,
      };
      await upsertBooking(updated);
      return NextResponse.json(updated);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update booking." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withAdminAuth(async () => {
    const { id } = await req.json();
    await deleteBooking(id);
    return NextResponse.json({ ok: true });
  });
}
