import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { createId, deleteWorkOrder, loadWorkOrders, resolveWorkOrderLinks, upsertWorkOrder } from "@/lib/shop-data";
import type { Priority, WorkOrder } from "@/lib/shop-types";
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

      const vin = typeof body.vehicle?.vin === "string" ? body.vehicle.vin.trim() : "";
      const plate = typeof body.vehicle?.plate === "string" ? body.vehicle.plate.trim() : "";
      const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo.trim() : "";
      if (!vin) {
        return NextResponse.json({ error: "VIN is required." }, { status: 400 });
      }
      if (!plate) {
        return NextResponse.json({ error: "License plate is required." }, { status: 400 });
      }
      if (!assignedTo) {
        return NextResponse.json({ error: "Assigned to is required." }, { status: 400 });
      }

      const order: WorkOrder = {
        id: createId(),
        customerId: optionalId(links.customerId),
        customerVehicleId: optionalId(links.customerVehicleId),
        customerName: links.customerName,
        phone: links.phone,
        vehicle: links.vehicle,
        customerConcern: body.customerConcern ?? "",
        service: typeof body.service === "string" && body.service.trim() ? body.service.trim() : "General repair",
        status: parseStatus(body.status),
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

      const updated: WorkOrder = {
        id: item.id,
        customerId: optionalId(links.customerId ?? item.customerId),
        customerVehicleId: manualJobVehicle
          ? undefined
          : optionalId(links.customerVehicleId ?? body.customerVehicleId ?? item.customerVehicleId),
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
        scheduledDate: optionalId(body.scheduledDate) ?? item.scheduledDate,
        documentData:
          body.documentData && typeof body.documentData === "object"
            ? body.documentData
            : item.documentData,
        createdAt: item.createdAt,
        updatedAt: new Date().toISOString(),
      };
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
