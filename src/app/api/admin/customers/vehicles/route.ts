import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  createId,
  deleteCustomerVehicle,
  getCustomerById,
  loadCustomerVehicles,
  upsertCustomerVehicle,
} from "@/lib/shop-data";
import type { CustomerVehicle } from "@/lib/shop-types";

export async function GET(req: Request) {
  return withPermission("customers.view", async () => {
    const customerId = new URL(req.url).searchParams.get("customerId") ?? undefined;
    return NextResponse.json(await loadCustomerVehicles(customerId));
  });
}

export async function POST(req: Request) {
  return withPermission("customers.create", async () => {
    const body = await req.json();
    const customerId = String(body.customerId ?? "").trim();
    if (!customerId) return NextResponse.json({ error: "Customer is required." }, { status: 400 });
    const customer = await getCustomerById(customerId);
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const vehicle: CustomerVehicle = {
      id: createId(),
      customerId,
      year: body.year != null && body.year !== "" ? Number(body.year) : undefined,
      make: body.make || undefined,
      model: body.model || undefined,
      trim: body.trim || undefined,
      vin: body.vin || undefined,
      plate: body.plate || undefined,
      powertrain: body.powertrain || undefined,
      notes: body.notes || undefined,
      createdAt: new Date().toISOString(),
    };
    await upsertCustomerVehicle(vehicle);
    return NextResponse.json(vehicle);
  });
}

export async function PATCH(req: Request) {
  return withPermission("customers.edit", async () => {
    const body = await req.json();
    const vehicles = await loadCustomerVehicles();
    const item = vehicles.find((vehicle) => vehicle.id === body.id);
    if (!item) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    const updated: CustomerVehicle = {
      ...item,
      ...body,
      year: body.year != null && body.year !== "" ? Number(body.year) : item.year,
    };
    await upsertCustomerVehicle(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("customers.delete", async () => {
    const { id } = await req.json();
    await deleteCustomerVehicle(id);
    return NextResponse.json({ ok: true });
  });
}
