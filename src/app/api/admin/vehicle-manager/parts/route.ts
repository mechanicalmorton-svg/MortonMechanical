import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { createVmId, deleteVmPart, loadVmParts, upsertVmPart } from "@/lib/vehicle-manager-data";
import type { VmPart } from "@/lib/shop-types";

export async function GET() {
  return withPermission("vehicle_manager.view", async () => NextResponse.json(await loadVmParts()));
}

export async function POST(req: Request) {
  return withPermission("vehicle_manager.create", async () => {
    const body = await req.json();
    const part: VmPart = {
      id: createVmId(),
      name: String(body.name ?? "").trim() || "New part",
      partNumber: String(body.partNumber ?? "").trim(),
      description: String(body.description ?? "").trim(),
    };
    await upsertVmPart(part);
    return NextResponse.json(part);
  });
}

export async function PATCH(req: Request) {
  return withPermission("vehicle_manager.edit", async () => {
    const body = await req.json();
    const items = await loadVmParts();
    const item = items.find((p) => p.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated: VmPart = {
      ...item,
      name: body.name != null ? String(body.name).trim() : item.name,
      partNumber: body.partNumber != null ? String(body.partNumber).trim() : item.partNumber,
      description: body.description != null ? String(body.description).trim() : item.description,
    };
    await upsertVmPart(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("vehicle_manager.delete", async () => {
    const { id } = await req.json();
    await deleteVmPart(id);
    return NextResponse.json({ ok: true });
  });
}
