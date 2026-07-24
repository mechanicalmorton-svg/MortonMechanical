import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { createId, deleteFleetVehicle, loadFleet, upsertFleetVehicle } from "@/lib/shop-data";
import type { FleetVehicle } from "@/lib/shop-types";

export async function GET() {
  return withAdminAuth(async () => NextResponse.json(await loadFleet()));
}

export async function POST(req: Request) {
  return withAdminAuth(async () => {
    const body = await req.json();
    const vehicle: FleetVehicle = {
      id: createId(),
      name: body.name ?? "New vehicle",
      plate: body.plate ?? "",
      type: body.type ?? "Service Van",
      make: body.make,
      model: body.model,
      year: body.year,
      status: body.status ?? "active",
      mileage: body.mileage,
      lastService: body.lastService,
    };
    await upsertFleetVehicle(vehicle);
    return NextResponse.json(vehicle);
  });
}

export async function PATCH(req: Request) {
  return withAdminAuth(async () => {
    const body = await req.json();
    const items = await loadFleet();
    const item = items.find((v) => v.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated = { ...item, ...body };
    await upsertFleetVehicle(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withAdminAuth(async () => {
    const { id } = await req.json();
    await deleteFleetVehicle(id);
    return NextResponse.json({ ok: true });
  });
}
