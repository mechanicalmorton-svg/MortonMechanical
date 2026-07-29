import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { normalizePlate, normalizeVin, plateValidationError, vinValidationError } from "@/lib/customer-vehicles";
import {
  createId,
  deleteWorkOrder,
  getCustomerById,
  getCustomerVehicleById,
  loadStaff,
  loadWorkOrders,
  resolveWorkOrderLinks,
  upsertWorkOrder,
} from "@/lib/shop-data";
import type { Priority, WorkOrder } from "@/lib/shop-types";
import { hydrateWorkOrderDocuments } from "@/lib/work-order-documents";
import { normalizeWorkOrderStatus } from "@/lib/work-order-status";

function parseStatus(value: unknown) {
  return normalizeWorkOrderStatus(value);
}

function parsePriority(value: unknown): Priority {
  return value === "urgent" ? "urgent" : "normal";
}

function optionalId(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

async function withFilledDocuments(order: WorkOrder): Promise<WorkOrder> {
  const [customer, vehicle, staff] = await Promise.all([
    order.customerId ? getCustomerById(order.customerId) : Promise.resolve(null),
    order.customerVehicleId ? getCustomerVehicleById(order.customerVehicleId) : Promise.resolve(null),
    order.assignedTo ? loadStaff() : Promise.resolve([]),
  ]);
  const advisorName =
    order.assignedTo && Array.isArray(staff)
      ? staff.find((member) => member.id === order.assignedTo)?.name
      : undefined;
  return hydrateWorkOrderDocuments(order, {
    customer,
    vehicle,
    advisorName,
  });
}

export async function GET() {
  return withPermission("work_orders.view", async () => {
    const items = await loadWorkOrders();
    return NextResponse.json(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  });
}

export async function POST(req: Request) {
  return withPermission("work_orders.create", async () => {
    try {
      const body = await req.json();
      const now = new Date().toISOString();
      const links = await resolveWorkOrderLinks({
        customerId: body.customerId,
        customerVehicleId: body.customerVehicleId,
        customerName: body.customerName,
        phone: body.phone,
        vehicle: body.vehicle,
        saveVehicleToFile: body.saveVehicleToFile,
      });

      if (!links.customerId) {
        return NextResponse.json({ error: "Select a customer for this work order." }, { status: 400 });
      }

      const vin = typeof body.vehicle?.vin === "string" ? normalizeVin(body.vehicle.vin) : "";
      const plate = typeof body.vehicle?.plate === "string" ? normalizePlate(body.vehicle.plate) : "";
      const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo.trim() : "";
      const vinError = vinValidationError(vin);
      if (vinError) {
        return NextResponse.json({ error: vinError }, { status: 400 });
      }
      const plateError = plateValidationError(plate);
      if (plateError) {
        return NextResponse.json({ error: plateError }, { status: 400 });
      }
      if (!assignedTo) {
        return NextResponse.json({ error: "Assigned to is required." }, { status: 400 });
      }

      const status = parseStatus(body.status);
      const draft: WorkOrder = {
        id: createId(),
        customerId: optionalId(links.customerId),
        customerVehicleId: optionalId(links.customerVehicleId),
        bookingId: optionalId(body.bookingId),
        serviceId: optionalId(body.serviceId) || undefined,
        customerName: links.customerName,
        phone: links.phone,
        vehicle: links.vehicle,
        customerConcern: body.customerConcern ?? "",
        service: typeof body.service === "string" && body.service.trim() ? body.service.trim() : "General repair",
        status,
        priority: parsePriority(body.priority),
        assignedTo,
        notes: body.notes,
        internalNotes: body.internalNotes ?? "",
        revenue: body.revenue,
        paymentStatus: "unpaid",
        scheduledDate: body.scheduledDate,
        createdAt: now,
        updatedAt: now,
      };
      const order = await withFilledDocuments(draft);
      await upsertWorkOrder(order);
      return NextResponse.json(order);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create work order." }, { status: 400 });
    }
  });
}

export async function PATCH(req: Request) {
  return withPermission("work_orders.edit", async () => {
    try {
      const body = await req.json();
      const items = await loadWorkOrders();
      const item = items.find((w) => w.id === body.id);
      if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

      const links = await resolveWorkOrderLinks({
        customerId: body.customerId ?? item.customerId,
        customerVehicleId: body.customerVehicleId ?? item.customerVehicleId,
        customerName: body.customerName ?? item.customerName,
        phone: body.phone ?? item.phone,
        vehicle: body.vehicle,
        saveVehicleToFile: body.saveVehicleToFile,
      });

      const manualJobVehicle =
        body.saveVehicleToFile === false &&
        !optionalId(body.customerVehicleId) &&
        !optionalId(links.customerVehicleId);

      const paymentStatus =
        body.paymentStatus === "paid" || body.paymentStatus === "unpaid" || body.paymentStatus === "deposit_paid"
          ? body.paymentStatus
          : (item.paymentStatus ?? "unpaid");

      const draft: WorkOrder = {
        id: item.id,
        customerId: optionalId(links.customerId ?? item.customerId),
        customerVehicleId: manualJobVehicle
          ? undefined
          : optionalId(links.customerVehicleId ?? body.customerVehicleId ?? item.customerVehicleId),
        bookingId: optionalId(body.bookingId) ?? item.bookingId,
        serviceId: body.serviceId !== undefined ? optionalId(body.serviceId) || "" : item.serviceId,
        customerName: links.customerName || item.customerName,
        phone: links.phone || item.phone,
        vehicle: links.vehicle || item.vehicle,
        customerConcern:
          typeof body.customerConcern === "string" ? body.customerConcern : item.customerConcern ?? "",
        service: typeof body.service === "string" && body.service.trim() ? body.service.trim() : item.service,
        status: body.status ? parseStatus(body.status) : item.status,
        priority: body.priority ? parsePriority(body.priority) : item.priority,
        assignedTo: optionalId(body.assignedTo) ?? item.assignedTo,
        notes: typeof body.notes === "string" ? body.notes : item.notes,
        internalNotes:
          typeof body.internalNotes === "string" ? body.internalNotes : item.internalNotes ?? "",
        revenue: body.revenue ?? item.revenue,
        paymentStatus,
        stripeCheckoutSessionId: item.stripeCheckoutSessionId,
        scheduledDate: optionalId(body.scheduledDate) ?? item.scheduledDate,
        documentData:
          body.documentData && typeof body.documentData === "object"
            ? body.documentData
            : item.documentData,
        createdAt: item.createdAt,
        updatedAt: new Date().toISOString(),
      };

      // Document editor saves already include full field payloads; still re-sync live WO fields.
      const updated = await withFilledDocuments(draft);
      await upsertWorkOrder(updated);
      return NextResponse.json(updated);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update work order." }, { status: 400 });
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("work_orders.delete", async () => {
    const { id } = await req.json();
    await deleteWorkOrder(id);
    return NextResponse.json({ ok: true });
  });
}
