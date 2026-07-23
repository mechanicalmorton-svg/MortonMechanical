import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { createId, deleteInventoryItem, loadInventory, upsertInventoryItem } from "@/lib/shop-data";
import type { InventoryItem } from "@/lib/shop-types";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json(await loadInventory());
}

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  const item: InventoryItem = {
    id: createId(),
    name: body.name ?? "New part",
    sku: body.sku ?? "",
    category: body.category ?? "General",
    quantity: Number(body.quantity) || 0,
    minStock: Number(body.minStock) || 1,
    unitCost: Number(body.unitCost) || 0,
    supplier: body.supplier,
    location: body.location,
    updatedAt: new Date().toISOString(),
  };
  await upsertInventoryItem(item);
  return NextResponse.json(item);
}

export async function PATCH(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  const items = await loadInventory();
  const item = items.find((i) => i.id === body.id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const updated = { ...item, ...body, updatedAt: new Date().toISOString() };
  await upsertInventoryItem(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await req.json();
  await deleteInventoryItem(id);
  return NextResponse.json({ ok: true });
}
