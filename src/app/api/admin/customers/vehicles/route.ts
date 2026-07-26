import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { normalizePlate, normalizeVin, plateValidationError, vinValidationError } from "@/lib/customer-vehicles";
import {
  createId,
  deleteCustomerVehicle,
  getCustomerById,
  loadCustomerVehicles,
  upsertCustomerVehicle,
} from "@/lib/shop-data";
import type { CustomerVehicle } from "@/lib/shop-types";

function parseVehicleIdentity(body: Record<string, unknown>, existing?: CustomerVehicle) {
  const vinRaw = body.vin !== undefined ? normalizeVin(String(body.vin ?? "")) : existing?.vin;
  const plateRaw = body.plate !== undefined ? normalizePlate(String(body.plate ?? "")) : existing?.plate;
  const vin = vinRaw || undefined;
  const plate = plateRaw || undefined;

  if (vin) {
    const vinError = vinValidationError(vin);
    if (vinError) throw new Error(vinError);
  }
  if (plate) {
    const plateError = plateValidationError(plate);
    if (plateError) throw new Error(plateError);
  }

  return { vin, plate };
}

export async function GET(req: Request) {
  return withPermission("customers.view", async () => {
    const customerId = new URL(req.url).searchParams.get("customerId") ?? undefined;
    return NextResponse.json(await loadCustomerVehicles(customerId));
  });
}

export async function POST(req: Request) {
  return withPermission("customers.create", async () => {
    try {
      const body = await req.json();
      const customerId = String(body.customerId ?? "").trim();
      if (!customerId) return NextResponse.json({ error: "Customer is required." }, { status: 400 });
      const customer = await getCustomerById(customerId);
      if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

      const { vin, plate } = parseVehicleIdentity(body);
      const vehicle: CustomerVehicle = {
        id: createId(),
        customerId,
        year: body.year != null && body.year !== "" ? Number(body.year) : undefined,
        make: body.make || undefined,
        model: body.model || undefined,
        trim: body.trim || undefined,
        vin,
        plate,
        powertrain: body.powertrain || undefined,
        notes: body.notes || undefined,
        createdAt: new Date().toISOString(),
      };
      await upsertCustomerVehicle(vehicle);
      return NextResponse.json(vehicle);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not create vehicle." },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(req: Request) {
  return withPermission("customers.edit", async () => {
    try {
      const body = await req.json();
      const vehicles = await loadCustomerVehicles();
      const item = vehicles.find((vehicle) => vehicle.id === body.id);
      if (!item) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
      const { vin, plate } = parseVehicleIdentity(body, item);
      const updated: CustomerVehicle = {
        ...item,
        year: body.year != null && body.year !== "" ? Number(body.year) : item.year,
        make: typeof body.make === "string" ? body.make.trim() || undefined : item.make,
        model: typeof body.model === "string" ? body.model.trim() || undefined : item.model,
        trim: typeof body.trim === "string" ? body.trim.trim() || undefined : item.trim,
        vin: body.vin !== undefined ? vin : item.vin,
        plate: body.plate !== undefined ? plate : item.plate,
        powertrain: typeof body.powertrain === "string" ? body.powertrain.trim() || undefined : item.powertrain,
        notes: typeof body.notes === "string" ? body.notes.trim() || undefined : item.notes,
        mileage:
          body.mileage != null && body.mileage !== "" && Number.isFinite(Number(body.mileage))
            ? Number(body.mileage)
            : item.mileage,
      };
      await upsertCustomerVehicle(updated);
      return NextResponse.json(updated);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update vehicle." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("customers.delete", async () => {
    const { id } = await req.json();
    await deleteCustomerVehicle(id);
    return NextResponse.json({ ok: true });
  });
}
