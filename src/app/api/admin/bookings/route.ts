import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { orchestrateBookingConfirmed, orchestrateBookingCreated } from "@/lib/booking-workflow";
import {
  createId,
  deleteBooking,
  findOrCreateCustomer,
  getCustomerById,
  getCustomerVehicleById,
  loadBookings,
  upsertBooking,
} from "@/lib/shop-data";
import type { Booking, BookingLocationType, BookingStatus } from "@/lib/shop-types";

function parseStatus(value: unknown): BookingStatus {
  if (value === "confirmed" || value === "completed" || value === "cancelled" || value === "pending") return value;
  return "pending";
}

function parseLocationType(value: unknown): BookingLocationType | undefined {
  if (
    value === "home" ||
    value === "work" ||
    value === "business" ||
    value === "apartment" ||
    value === "roadside" ||
    value === "other"
  ) {
    return value;
  }
  return undefined;
}

function parseCoord(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parsePhotoUrls(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((url): url is string => typeof url === "string" && Boolean(url.trim()));
}

async function assertVehicleBelongsToCustomer(customerId: string | undefined, vehicleId: string | undefined) {
  if (!vehicleId) return;
  const vehicle = await getCustomerVehicleById(vehicleId);
  if (!vehicle) throw new Error("Selected customer vehicle was not found.");
  if (customerId && vehicle.customerId !== customerId) {
    throw new Error("Vehicle does not belong to this customer.");
  }
}

function scheduleChanged(before: Booking, after: Booking) {
  return (
    before.date !== after.date ||
    before.time !== after.time ||
    before.assignedTo !== after.assignedTo ||
    before.address !== after.address ||
    before.service !== after.service ||
    before.customerVehicleId !== after.customerVehicleId ||
    before.problemDescription !== after.problemDescription ||
    before.locationType !== after.locationType ||
    before.gateCode !== after.gateCode ||
    before.accessNotes !== after.accessNotes ||
    before.lat !== after.lat ||
    before.lng !== after.lng
  );
}

export async function GET() {
  return withPermission("bookings.view", async () => {
    const items = await loadBookings();
    return NextResponse.json(items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
}

export async function POST(req: Request) {
  return withPermission("bookings.create", async () => {
    try {
      const body = await req.json();
      let customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
      let customerName = String(body.customerName ?? "").trim();
      let phone = String(body.phone ?? "").trim();
      let email = typeof body.email === "string" ? body.email.trim() : "";
      let address = typeof body.address === "string" ? body.address.trim() : "";
      const customerVehicleId =
        typeof body.customerVehicleId === "string" ? body.customerVehicleId.trim() : "";
      const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo.trim() : "";

      if (customerId) {
        const customer = await getCustomerById(customerId);
        if (!customer) return NextResponse.json({ error: "Selected customer was not found." }, { status: 400 });
        customerName = customer.name;
        phone = customer.phone || phone;
        email = customer.email || email;
        address = address || customer.address || "";
      } else if (customerName && phone) {
        const customer = await findOrCreateCustomer({ name: customerName, phone, email, address });
        customerId = customer.id;
        customerName = customer.name;
        phone = customer.phone;
        email = customer.email ?? email;
        address = address || customer.address || "";
      }

      if (!customerName || !phone) {
        return NextResponse.json({ error: "Customer name and phone are required." }, { status: 400 });
      }

      await assertVehicleBelongsToCustomer(customerId || undefined, customerVehicleId || undefined);

      const durationRaw = Number(body.durationMinutes);
      const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
      const booking: Booking = {
        id: createId(),
        customerId: customerId || undefined,
        quoteId: typeof body.quoteId === "string" ? body.quoteId.trim() || undefined : undefined,
        customerVehicleId: customerVehicleId || undefined,
        serviceId: serviceId || undefined,
        assignedTo: assignedTo || undefined,
        customerName,
        phone,
        email: email || undefined,
        service: String(body.service ?? "General service").trim() || "General service",
        date: String(body.date ?? new Date().toISOString().slice(0, 10)),
        time: String(body.time ?? "09:00"),
        address: address || undefined,
        locationType: parseLocationType(body.locationType),
        gateCode: typeof body.gateCode === "string" ? body.gateCode.trim() || undefined : undefined,
        accessNotes: typeof body.accessNotes === "string" ? body.accessNotes.trim() || undefined : undefined,
        lat: parseCoord(body.lat),
        lng: parseCoord(body.lng),
        photoUrls: parsePhotoUrls(body.photoUrls) ?? [],
        problemDescription:
          typeof body.problemDescription === "string" ? body.problemDescription.trim() || undefined : undefined,
        durationMinutes: Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : 60,
        status: parseStatus(body.status),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        createdAt: new Date().toISOString(),
      };
      await upsertBooking(booking);

      const orchestration = await orchestrateBookingCreated(booking);
      return NextResponse.json({
        ...orchestration.booking,
        orchestration: {
          spawnedWorkOrder: orchestration.spawnedWorkOrder,
          syncedRouteStop: orchestration.syncedRouteStop,
          skippedReason: orchestration.skippedReason,
          workOrderId: orchestration.workOrder?.id,
          routeId: orchestration.route?.id,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not create booking." },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(req: Request) {
  return withPermission("bookings.edit", async () => {
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
        address = address || customer.address || address;
      }

      const customerVehicleId =
        typeof body.customerVehicleId === "string"
          ? body.customerVehicleId.trim() || undefined
          : item.customerVehicleId;
      const assignedTo =
        typeof body.assignedTo === "string" ? body.assignedTo.trim() || undefined : item.assignedTo;

      await assertVehicleBelongsToCustomer(customerId || undefined, customerVehicleId);

      const durationRaw = body.durationMinutes != null ? Number(body.durationMinutes) : item.durationMinutes;

      const updated: Booking = {
        ...item,
        customerId: customerId || undefined,
        quoteId: typeof body.quoteId === "string" ? body.quoteId.trim() || undefined : item.quoteId,
        customerVehicleId,
        workOrderId:
          typeof body.workOrderId === "string" ? body.workOrderId.trim() || undefined : item.workOrderId,
        serviceId:
          typeof body.serviceId === "string" ? body.serviceId.trim() || undefined : item.serviceId,
        assignedTo,
        customerName,
        phone,
        email: email || undefined,
        service: typeof body.service === "string" ? body.service.trim() || item.service : item.service,
        date: typeof body.date === "string" ? body.date : item.date,
        time: typeof body.time === "string" ? body.time : item.time,
        address: address || undefined,
        locationType:
          body.locationType !== undefined ? parseLocationType(body.locationType) : item.locationType,
        gateCode:
          typeof body.gateCode === "string" ? body.gateCode.trim() || undefined : item.gateCode,
        accessNotes:
          typeof body.accessNotes === "string" ? body.accessNotes.trim() || undefined : item.accessNotes,
        lat: body.lat !== undefined ? parseCoord(body.lat) : item.lat,
        lng: body.lng !== undefined ? parseCoord(body.lng) : item.lng,
        photoUrls: body.photoUrls !== undefined ? parsePhotoUrls(body.photoUrls) ?? [] : item.photoUrls,
        problemDescription:
          typeof body.problemDescription === "string"
            ? body.problemDescription.trim() || undefined
            : item.problemDescription,
        durationMinutes:
          durationRaw != null && Number.isFinite(Number(durationRaw)) && Number(durationRaw) > 0
            ? Math.round(Number(durationRaw))
            : item.durationMinutes ?? 60,
        status: body.status ? parseStatus(body.status) : item.status,
        notes: typeof body.notes === "string" ? body.notes : item.notes,
      };
      await upsertBooking(updated);

      const becameConfirmed =
        (item.status !== "confirmed" && item.status !== "completed") &&
        (updated.status === "confirmed" || updated.status === "completed");
      const needsResync =
        (updated.status === "confirmed" || updated.status === "completed") && scheduleChanged(item, updated);

      let result = updated;
      let orchestration:
        | Awaited<ReturnType<typeof orchestrateBookingConfirmed>>
        | undefined;

      if (becameConfirmed || needsResync) {
        orchestration = await orchestrateBookingConfirmed(updated);
        result = orchestration.booking;
      }

      return NextResponse.json({
        ...result,
        orchestration: orchestration
          ? {
              spawnedWorkOrder: orchestration.spawnedWorkOrder,
              syncedRouteStop: orchestration.syncedRouteStop,
              skippedReason: orchestration.skippedReason,
              workOrderId: orchestration.workOrder?.id,
              routeId: orchestration.route?.id,
            }
          : undefined,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update booking." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("bookings.delete", async () => {
    const { id } = await req.json();
    await deleteBooking(id);
    return NextResponse.json({ ok: true });
  });
}
