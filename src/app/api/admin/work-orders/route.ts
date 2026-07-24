import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { createId, deleteWorkOrder, loadWorkOrders, upsertWorkOrder } from "@/lib/shop-data";
import type { WorkOrder } from "@/lib/shop-types";

export async function GET() {
  return withAdminAuth(async () => {
    const items = await loadWorkOrders();
    return NextResponse.json(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  });
}

export async function POST(req: Request) {
  return withAdminAuth(async () => {
    const body = await req.json();
    const now = new Date().toISOString();
    const order: WorkOrder = {
      id: createId(),
      customerName: body.customerName ?? "Unknown",
      phone: body.phone ?? "",
      vehicle: body.vehicle ?? "",
      service: body.service ?? "General repair",
      status: body.status ?? "open",
      priority: body.priority ?? "normal",
      assignedTo: body.assignedTo,
      notes: body.notes,
      revenue: body.revenue,
      scheduledDate: body.scheduledDate,
      createdAt: now,
      updatedAt: now,
    };
    await upsertWorkOrder(order);
    return NextResponse.json(order);
  });
}

export async function PATCH(req: Request) {
  return withAdminAuth(async () => {
    const body = await req.json();
    const items = await loadWorkOrders();
    const item = items.find((w) => w.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated = { ...item, ...body, updatedAt: new Date().toISOString() };
    await upsertWorkOrder(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withAdminAuth(async () => {
    const { id } = await req.json();
    await deleteWorkOrder(id);
    return NextResponse.json({ ok: true });
  });
}
