import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  deleteVehicleServiceHistory,
  loadVehicleServiceHistory,
  newServiceHistoryId,
  upsertVehicleServiceHistory,
} from "@/lib/vehicle-service-history";
import type { VehicleServiceHistoryEntry } from "@/lib/shop-types";

export async function GET(req: Request) {
  return withPermission("customers.view", async () => {
    try {
      const vehicleId = new URL(req.url).searchParams.get("customerVehicleId")?.trim() || "";
      if (!vehicleId) {
        return NextResponse.json({ error: "customerVehicleId is required." }, { status: 400 });
      }
      return NextResponse.json(await loadVehicleServiceHistory(vehicleId));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not load service history." },
        { status: 400 },
      );
    }
  });
}

export async function POST(req: Request) {
  return withPermission("customers.edit", async () => {
    try {
      const body = await req.json();
      const customerVehicleId = String(body.customerVehicleId ?? "").trim();
      if (!customerVehicleId) {
        return NextResponse.json({ error: "customerVehicleId is required." }, { status: 400 });
      }
      const mileageRaw = body.mileage != null && body.mileage !== "" ? Number(body.mileage) : undefined;
      const entry: VehicleServiceHistoryEntry = {
        id: typeof body.id === "string" && body.id.trim() ? body.id.trim() : newServiceHistoryId(),
        customerVehicleId,
        performedOn: String(body.performedOn ?? new Date().toISOString().slice(0, 10)),
        mileage: mileageRaw != null && Number.isFinite(mileageRaw) ? Math.round(mileageRaw) : undefined,
        category: String(body.category ?? "Service").trim() || "Service",
        summary: String(body.summary ?? "").trim(),
        description: typeof body.description === "string" ? body.description.trim() || undefined : undefined,
        workOrderId: typeof body.workOrderId === "string" ? body.workOrderId.trim() || undefined : undefined,
        bookingId: typeof body.bookingId === "string" ? body.bookingId.trim() || undefined : undefined,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json(await upsertVehicleServiceHistory(entry));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not save service history." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("customers.edit", async () => {
    try {
      const body = await req.json();
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      await deleteVehicleServiceHistory(id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete service history." },
        { status: 400 },
      );
    }
  });
}
