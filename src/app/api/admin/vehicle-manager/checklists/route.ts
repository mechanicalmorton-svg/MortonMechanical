import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  createVmId,
  deleteVmChecklist,
  loadVmChecklists,
  upsertVmChecklist,
} from "@/lib/vehicle-manager-data";
import type { VmChecklist, VmChecklistItem } from "@/lib/shop-types";

function normalizeItems(raw: unknown): VmChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      const row = entry as Record<string, unknown>;
      const vehicleId = String(row.vehicleId ?? "").trim();
      if (!vehicleId) return null;
      return {
        id: String(row.id ?? createVmId()),
        vehicleId,
        sortOrder: Number(row.sortOrder) || index,
        isDone: Boolean(row.isDone),
      };
    })
    .filter((item): item is VmChecklistItem => Boolean(item));
}

export async function GET() {
  return withPermission("vehicle_manager.view", async () => NextResponse.json(await loadVmChecklists()));
}

export async function POST(req: Request) {
  return withPermission("vehicle_manager.create", async () => {
    const body = await req.json();
    const checklist: VmChecklist = {
      id: createVmId(),
      name: String(body.name ?? "").trim() || "Checklist",
      createdAt: new Date().toISOString(),
      items: normalizeItems(body.items ?? body.vehicleIds?.map((vehicleId: string, index: number) => ({
        vehicleId,
        sortOrder: index,
        isDone: false,
      }))),
    };
    await upsertVmChecklist(checklist);
    return NextResponse.json(checklist);
  });
}

export async function PATCH(req: Request) {
  return withPermission("vehicle_manager.edit", async () => {
    const body = await req.json();
    const items = await loadVmChecklists();
    const item = items.find((c) => c.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Toggle a single checklist item
    if (body.toggleItemId) {
      const nextItems = item.items.map((row) =>
        row.id === body.toggleItemId ? { ...row, isDone: !row.isDone } : row,
      );
      const updated = { ...item, items: nextItems };
      await upsertVmChecklist(updated);
      return NextResponse.json(updated);
    }

    const updated: VmChecklist = {
      ...item,
      name: body.name != null ? String(body.name).trim() : item.name,
      items: body.items != null ? normalizeItems(body.items) : item.items,
    };
    await upsertVmChecklist(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("vehicle_manager.delete", async () => {
    const { id } = await req.json();
    await deleteVmChecklist(id);
    return NextResponse.json({ ok: true });
  });
}
