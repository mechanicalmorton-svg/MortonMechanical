import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { syncVmVehicleToFleet } from "@/lib/fleet-vm-sync";
import {
  createVmId,
  deleteVmServiceOrder,
  loadVmServiceOrders,
  loadVmVehicles,
  upsertVmServiceOrder,
  upsertVmVehicle,
} from "@/lib/vehicle-manager-data";
import type { VmServiceOrder, VmServiceOrderPart } from "@/lib/shop-types";

async function syncVehicleFromOrder(order: VmServiceOrder) {
  const vehicles = await loadVmVehicles();
  const vehicle = vehicles.find((v) => v.id === order.vehicleId);
  if (!vehicle) return;
  const mileageNum = Number(String(order.mileage).replace(/,/g, ""));
  const updated = {
    ...vehicle,
    mileage: Number.isFinite(mileageNum) && mileageNum > 0 ? mileageNum : vehicle.mileage,
    lastService: order.createdAt.slice(0, 10),
  };
  await upsertVmVehicle(updated);
  await syncVmVehicleToFleet(updated);
}

function normalizeParts(raw: unknown): VmServiceOrderPart[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const partId = String(row.partId ?? "").trim();
      if (!partId) return null;
      return {
        id: String(row.id ?? createVmId()),
        partId,
        quantity: Math.max(1, Number(row.quantity) || 1),
      };
    })
    .filter((part): part is VmServiceOrderPart => Boolean(part));
}

export async function GET(req: Request) {
  return withPermission("vehicle_manager.view", async () => {
    const vehicleId = new URL(req.url).searchParams.get("vehicleId")?.trim() || undefined;
    return NextResponse.json(await loadVmServiceOrders(vehicleId));
  });
}

export async function POST(req: Request) {
  return withPermission("vehicle_manager.create", async (user) => {
    const body = await req.json();
    const vehicleId = String(body.vehicleId ?? "").trim();
    if (!vehicleId) return NextResponse.json({ error: "Vehicle is required." }, { status: 400 });
    const createdBy = (user.name || user.email || "").trim() || undefined;
    const order: VmServiceOrder = {
      id: createVmId(),
      vehicleId,
      mileage: String(body.mileage ?? "").trim(),
      workNeeded: String(body.workNeeded ?? "").trim(),
      dvir: String(body.dvir ?? "").trim(),
      description: String(body.description ?? "").trim(),
      hours: Number(body.hours) || 0,
      activityId: body.activityId ? String(body.activityId) : undefined,
      parts: normalizeParts(body.parts),
      createdAt: new Date().toISOString(),
      createdBy,
      createdByUserId: user.id,
    };
    await upsertVmServiceOrder(order);
    await syncVehicleFromOrder(order);
    return NextResponse.json(order);
  });
}

export async function PATCH(req: Request) {
  return withPermission("vehicle_manager.edit", async () => {
    const body = await req.json();
    const items = await loadVmServiceOrders();
    const item = items.find((o) => o.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated: VmServiceOrder = {
      ...item,
      mileage: body.mileage != null ? String(body.mileage).trim() : item.mileage,
      workNeeded: body.workNeeded != null ? String(body.workNeeded).trim() : item.workNeeded,
      dvir: body.dvir != null ? String(body.dvir).trim() : item.dvir,
      description: body.description != null ? String(body.description).trim() : item.description,
      hours: body.hours != null ? Number(body.hours) || 0 : item.hours,
      activityId:
        body.activityId !== undefined
          ? body.activityId
            ? String(body.activityId)
            : undefined
          : item.activityId,
      parts: body.parts != null ? normalizeParts(body.parts) : item.parts,
    };
    await upsertVmServiceOrder(updated);
    await syncVehicleFromOrder(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("vehicle_manager.delete", async () => {
    const { id } = await req.json();
    await deleteVmServiceOrder(id);
    return NextResponse.json({ ok: true });
  });
}
