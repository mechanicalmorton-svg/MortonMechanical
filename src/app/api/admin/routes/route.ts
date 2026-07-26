import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { applySyncedVehicleMileage } from "@/lib/fleet-vm-sync";
import { createId, deleteRoute, loadRoutes, upsertRoute } from "@/lib/shop-data";
import type { RoutePlan } from "@/lib/shop-types";

function parseMileage(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

async function syncRouteMileage(route: RoutePlan) {
  if (!route.vehicleId || route.mileage == null) return;
  await applySyncedVehicleMileage(route.vehicleId, route.mileage);
}

export async function GET() {
  return withPermission("routes.view", async () => {
    const items = await loadRoutes();
    return NextResponse.json(items.sort((a, b) => b.date.localeCompare(a.date)));
  });
}

export async function POST(req: Request) {
  return withPermission("routes.create", async () => {
    const body = await req.json();
    const mileage = parseMileage(body.mileage);
    const route: RoutePlan = {
      id: createId(),
      date: body.date ?? new Date().toISOString().slice(0, 10),
      driverId: body.driverId,
      vehicleId: body.vehicleId,
      stops: body.stops ?? [],
      status: body.status ?? "planned",
      notes: body.notes,
      mileage,
    };
    await upsertRoute(route);
    await syncRouteMileage(route);
    return NextResponse.json(route);
  });
}

export async function PATCH(req: Request) {
  return withPermission("routes.edit", async () => {
    const body = await req.json();
    const items = await loadRoutes();
    const item = items.find((r) => r.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const mileage =
      body.mileage !== undefined ? parseMileage(body.mileage) : item.mileage;

    const updated: RoutePlan = {
      ...item,
      ...body,
      id: item.id,
      mileage,
    };
    await upsertRoute(updated);
    if (body.mileage !== undefined) {
      await syncRouteMileage(updated);
    }
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
