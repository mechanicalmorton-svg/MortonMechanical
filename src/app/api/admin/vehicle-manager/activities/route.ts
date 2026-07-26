import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  createVmId,
  deleteVmActivity,
  loadVmActivities,
  upsertVmActivity,
} from "@/lib/vehicle-manager-data";
import type { VmActivity } from "@/lib/shop-types";

export async function GET() {
  return withPermission("vehicle_manager.view", async () => NextResponse.json(await loadVmActivities()));
}

export async function POST(req: Request) {
  return withPermission("vehicle_manager.create", async () => {
    const body = await req.json();
    const activity: VmActivity = {
      id: createVmId(),
      name: String(body.name ?? "").trim() || "New activity",
    };
    await upsertVmActivity(activity);
    return NextResponse.json(activity);
  });
}

export async function PATCH(req: Request) {
  return withPermission("vehicle_manager.edit", async () => {
    const body = await req.json();
    const items = await loadVmActivities();
    const item = items.find((a) => a.id === body.id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const updated: VmActivity = {
      ...item,
      name: body.name != null ? String(body.name).trim() : item.name,
    };
    await upsertVmActivity(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("vehicle_manager.delete", async () => {
    const { id } = await req.json();
    await deleteVmActivity(id);
    return NextResponse.json({ ok: true });
  });
}
