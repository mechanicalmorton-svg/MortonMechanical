import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { hasPermission, isFounder } from "@/lib/permissions/service";
import {
  createVmId,
  deleteVmVehicle,
  loadVmVehicles,
  upsertVmVehicle,
} from "@/lib/vehicle-manager-data";
import type { VmVehicle, VmVehicleStatus } from "@/lib/shop-types";

const STATUSES: VmVehicleStatus[] = ["active", "maintenance", "out_of_service"];

function parseStatus(value: unknown, fallback: VmVehicleStatus = "active"): VmVehicleStatus {
  if (value === "retired") return "out_of_service";
  return STATUSES.includes(value as VmVehicleStatus) ? (value as VmVehicleStatus) : fallback;
}

export async function GET() {
  return withPermission("vehicle_manager.view", async () => NextResponse.json(await loadVmVehicles()));
}

export async function POST(req: Request) {
  return withPermission("vehicle_manager.create", async () => {
    const body = await req.json();
    const vehicleNumber = String(body.vehicleNumber ?? "").trim();
    const vehicle: VmVehicle = {
      id: createVmId(),
      name: String(body.name ?? "").trim() || (vehicleNumber ? `Unit ${vehicleNumber}` : "New vehicle"),
      vehicleNumber,
      year: Number(body.year) || new Date().getFullYear(),
      make: String(body.make ?? "").trim(),
      model: String(body.model ?? "").trim(),
      status: parseStatus(body.status),
      mileage: body.mileage != null && body.mileage !== "" ? Number(body.mileage) : undefined,
      lastService: body.lastService ? String(body.lastService) : undefined,
    };
    await upsertVmVehicle(vehicle);
    return NextResponse.json(vehicle);
  });
}

export async function PATCH(req: Request) {
  return withPermission("vehicle_manager.edit", async (user) => {
    const body = await req.json();
    const items = await loadVmVehicles();
    const item = items.find((v) => v.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const nextStatus = body.status != null ? parseStatus(body.status, item.status) : item.status;
    if (
      item.status === "out_of_service" &&
      nextStatus !== "out_of_service" &&
      !isFounder(user) &&
      !hasPermission(user, "vehicle_manager.return_service")
    ) {
      return NextResponse.json(
        { error: "Only authorized roles can return a vehicle to service." },
        { status: 403 },
      );
    }
    const updated: VmVehicle = {
      ...item,
      name: body.name != null ? String(body.name).trim() || item.name : item.name,
      vehicleNumber: body.vehicleNumber != null ? String(body.vehicleNumber).trim() : item.vehicleNumber,
      year: body.year != null ? Number(body.year) || item.year : item.year,
      make: body.make != null ? String(body.make).trim() : item.make,
      model: body.model != null ? String(body.model).trim() : item.model,
      status: nextStatus,
      mileage:
        body.mileage !== undefined
          ? body.mileage === "" || body.mileage == null
            ? undefined
            : Number(body.mileage)
          : item.mileage,
      lastService:
        body.lastService !== undefined
          ? body.lastService
            ? String(body.lastService)
            : undefined
          : item.lastService,
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
