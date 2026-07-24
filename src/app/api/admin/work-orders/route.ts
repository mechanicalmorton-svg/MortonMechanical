import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { createId, deleteWorkOrder, loadWorkOrders, resolveWorkOrderLinks, upsertWorkOrder } from "@/lib/shop-data";
import type { Priority, WorkOrder, WorkOrderStatus } from "@/lib/shop-types";

function parseStatus(value: unknown): WorkOrderStatus {
  if (value === "in_progress" || value === "completed" || value === "cancelled" || value === "open") return value;
  return "open";
}

function parsePriority(value: unknown): Priority {
  return value === "urgent" ? "urgent" : "normal";
}

function optionalId(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

export async function GET() {
  return withAdminAuth(async () => {
    const items = await loadWorkOrders();
    return NextResponse.json(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  });
}

export async function POST(req: Request) {
  return withAdminAuth(async () => {
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

      const order: WorkOrder = {
        id: createId(),
        customerId: optionalId(links.customerId),
        customerVehicleId: optionalId(links.customerVehicleId),
        customerName: links.customerName,
        phone: links.phone,
        vehicle: links.vehicle,
        customerConcern: body.customerConcern ?? "",
        service: body.service ?? "General repair",
        status: parseStatus(body.status),
        priority: parsePriority(body.priority),
        assignedTo: body.assignedTo || undefined,
        notes: body.notes,
        internalNotes: body.internalNotes ?? "",
        revenue: body.revenue,
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
  return withAdminAuth(async () => {
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

      const updated: WorkOrder = {
        ...item,
        ...body,
        customerId: optionalId(links.customerId ?? item.customerId),
        customerVehicleId:
          body.saveVehicleToFile === false && !optionalId(body.customerVehicleId)
            ? undefined
            : optionalId(links.customerVehicleId ?? body.customerVehicleId ?? item.customerVehicleId),
        customerName: links.customerName || item.customerName,
        phone: links.phone || item.phone,
        vehicle: links.vehicle || item.vehicle,
        status: body.status ? parseStatus(body.status) : item.status,
        priority: body.priority ? parsePriority(body.priority) : item.priority,
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
  return withAdminAuth(async () => {
    const { id } = await req.json();
    await deleteWorkOrder(id);
    return NextResponse.json({ ok: true });
  });
}
