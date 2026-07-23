import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { createId, deleteBooking, loadBookings, upsertBooking } from "@/lib/shop-data";
import type { Booking } from "@/lib/shop-types";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const items = await loadBookings();
  return NextResponse.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  const booking: Booking = {
    id: createId(),
    customerName: body.customerName ?? "Unknown",
    phone: body.phone ?? "",
    email: body.email,
    service: body.service ?? "General service",
    date: body.date ?? new Date().toISOString().slice(0, 10),
    time: body.time ?? "09:00",
    address: body.address,
    status: body.status ?? "pending",
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };
  await upsertBooking(booking);
  return NextResponse.json(booking);
}

export async function PATCH(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  const items = await loadBookings();
  const item = items.find((b) => b.id === body.id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const updated = { ...item, ...body };
  await upsertBooking(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await req.json();
  await deleteBooking(id);
  return NextResponse.json({ ok: true });
}
