import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  createId,
  deleteCustomer,
  loadCustomerVehicles,
  loadCustomers,
  upsertCustomer,
} from "@/lib/shop-data";
import type { Customer } from "@/lib/shop-types";

export async function GET(req: Request) {
  return withPermission("customers.view", async () => {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") ?? undefined;
    const includeVehicles = url.searchParams.get("includeVehicles") === "1";
    const customers = await loadCustomers(query);

    if (!includeVehicles) return NextResponse.json(customers);

    const vehicles = await loadCustomerVehicles();
    const byCustomer = new Map<string, typeof vehicles>();
    for (const vehicle of vehicles) {
      const list = byCustomer.get(vehicle.customerId) ?? [];
      list.push(vehicle);
      byCustomer.set(vehicle.customerId, list);
    }

    return NextResponse.json(
      customers.map((customer) => ({
        ...customer,
        vehicles: byCustomer.get(customer.id) ?? [],
      })),
    );
  });
}

export async function POST(req: Request) {
  return withPermission("customers.create", async () => {
    const body = await req.json();
    const now = new Date().toISOString();
    const customer: Customer = {
      id: createId(),
      name: String(body.name ?? "").trim() || "New customer",
      phone: String(body.phone ?? "").trim(),
      email: String(body.email ?? "").trim() || undefined,
      address: String(body.address ?? "").trim() || undefined,
      notes: String(body.notes ?? "").trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await upsertCustomer(customer);
    return NextResponse.json(customer);
  });
}

export async function PATCH(req: Request) {
  return withPermission("customers.edit", async () => {
    const body = await req.json();
    const customers = await loadCustomers();
    const item = customers.find((customer) => customer.id === body.id);
    if (!item) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const updated: Customer = {
      ...item,
      ...body,
      name: String(body.name ?? item.name).trim() || item.name,
      phone: String(body.phone ?? item.phone).trim(),
      updatedAt: new Date().toISOString(),
    };
    await upsertCustomer(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("customers.delete", async () => {
    const { id } = await req.json();
    await deleteCustomer(id);
    return NextResponse.json({ ok: true });
  });
}
