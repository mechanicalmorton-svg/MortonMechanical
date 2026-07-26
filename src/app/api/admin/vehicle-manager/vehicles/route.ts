import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  createVmId,
  deleteVmVehicle,
  loadVmVehicles,
  upsertVmVehicle,
} from "@/lib/vehicle-manager-data";
import type { VmVehicle } from "@/lib/shop-types";

export async function GET() {
  return withPermission("vehicle_manager.view", async () => NextResponse.json(await loadVmVehicles()));
}

export async function POST(req: Request) {
  return withPermission("vehicle_manager.create", async () => {
    const body = await req.json();
    const vehicle: VmVehicle = {
      id: createVmId(),
      vehicleNumber: String(body.vehicleNumber ?? "").trim(),
      year: Number(body.year) || new Date().getFullYear(),
      make: String(body.make ?? "").trim(),
      model: String(body.model ?? "").trim(),
    };
    await upsertVmVehicle(vehicle);
    return NextResponse.json(vehicle);
  });
}

export async function PATCH(req: Request) {
  return withPermission("vehicle_manager.edit", async () => {
    const body = await req.json();
    const items = await loadVmVehicles();
    const item = items.find((v) => v.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated: VmVehicle = {
      ...item,
      vehicleNumber: body.vehicleNumber != null ? String(body.vehicleNumber).trim() : item.vehicleNumber,
      year: body.year != null ? Number(body.year) || item.year : item.year,
      make: body.make != null ? String(body.make).trim() : item.make,
      model: body.model != null ? String(body.model).trim() : item.model,
    };
    await upsertVmVehicle(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("vehicle_manager.delete", async () => {
    const { id } = await req.json();
    await deleteVmVehicle(id);
    return NextResponse.json({ ok: true });
  });
}
