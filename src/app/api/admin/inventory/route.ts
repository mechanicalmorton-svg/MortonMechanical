import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-route";
import { createId, deleteInventoryItem, loadInventory, upsertInventoryItem } from "@/lib/shop-data";
import type { InventoryItem } from "@/lib/shop-types";

export async function GET(req: Request) {
  return withAdminAuth(async () => {
    const sku = new URL(req.url).searchParams.get("sku")?.trim();
    if (sku) {
      const items = await loadInventory();
      const item = items.find((i) => i.sku.toLowerCase() === sku.toLowerCase());
      return NextResponse.json(item ?? null);
    }
    return NextResponse.json(await loadInventory());
  });
}

export async function POST(req: Request) {
  return withAdminAuth(async () => {
    const body = await req.json();
    const item: InventoryItem = {
      id: createId(),
      name: body.name ?? "New part",
      partNumber: body.partNumber ?? "",
      sku: body.sku ?? "",
      category: body.category ?? "General",
      quantity: Number(body.quantity) || 0,
      minStock: Number(body.minStock) || 1,
      unitCost: Number(body.unitCost) || 0,
      sellPrice: Number(body.sellPrice) || 0,
      supplier: body.supplier,
      supplierLink: body.supplierLink || undefined,
      vehicleId: body.vehicleId || undefined,
      location: body.location ?? "",
      updatedAt: new Date().toISOString(),
    };
    await upsertInventoryItem(item);
    return NextResponse.json(item);
  });
}

export async function PATCH(req: Request) {
  return withAdminAuth(async () => {
    const body = await req.json();
    const items = await loadInventory();

    if (body.sku && body.adjust !== undefined && !body.id) {
      const item = items.find((i) => i.sku.toLowerCase() === String(body.sku).trim().toLowerCase());
      if (!item) return NextResponse.json({ error: "SKU not found." }, { status: 404 });
      const updated = {
        ...item,
        quantity: Math.max(0, item.quantity + Number(body.adjust)),
        updatedAt: new Date().toISOString(),
      };
      await upsertInventoryItem(updated);
      return NextResponse.json(updated);
    }

    const item = items.find((i) => i.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated = { ...item, ...body, updatedAt: new Date().toISOString() };
    await upsertInventoryItem(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withAdminAuth(async () => {
    const { id } = await req.json();
    await deleteInventoryItem(id);
    return NextResponse.json({ ok: true });
  });
}
