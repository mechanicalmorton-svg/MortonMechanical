import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { createId, deleteRoute, loadRoutes, upsertRoute } from "@/lib/shop-data";
import type { RoutePlan } from "@/lib/shop-types";

export async function GET() {
  return withPermission("routes.view", async () => {
    const items = await loadRoutes();
    return NextResponse.json(items.sort((a, b) => b.date.localeCompare(a.date)));
  });
}

export async function POST(req: Request) {
  return withPermission("routes.create", async () => {
    const body = await req.json();
    const route: RoutePlan = {
      id: createId(),
      date: body.date ?? new Date().toISOString().slice(0, 10),
      driverId: body.driverId,
      vehicleId: body.vehicleId,
      stops: body.stops ?? [],
      status: body.status ?? "planned",
      notes: body.notes,
    };
    await upsertRoute(route);
    return NextResponse.json(route);
  });
}

export async function PATCH(req: Request) {
  return withPermission("routes.edit", async () => {
    const body = await req.json();
    const items = await loadRoutes();
    const item = items.find((r) => r.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated = { ...item, ...body };
    await upsertRoute(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("routes.delete", async () => {
    const { id } = await req.json();
    await deleteRoute(id);
    return NextResponse.json({ ok: true });
  });
}
