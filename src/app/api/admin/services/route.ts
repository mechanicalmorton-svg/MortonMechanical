import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  deleteShopService,
  loadShopServices,
  newShopServiceId,
  upsertShopService,
} from "@/lib/shop-services";
import type { ShopService } from "@/lib/shop-types";
import { SHOP_SERVICE_CATEGORIES } from "@/lib/shop-types";

function parseService(body: Record<string, unknown>, existing?: ShopService | null): ShopService {
  const now = new Date().toISOString();
  const name = String(body.name ?? existing?.name ?? "").trim();
  if (!name) throw new Error("Service name is required.");

  const categoryRaw = String(body.category ?? existing?.category ?? "Custom Repairs").trim();
  const category = categoryRaw || "Custom Repairs";

  const duration = Number(body.estimatedDurationMinutes ?? existing?.estimatedDurationMinutes ?? 60);
  const laborHours = Number(body.laborHours ?? existing?.laborHours ?? 1);
  const startingPrice = Number(body.startingPrice ?? existing?.startingPrice ?? 0);

  return {
    id: existing?.id || (typeof body.id === "string" && body.id.trim() ? body.id.trim() : newShopServiceId()),
    name,
    category: (SHOP_SERVICE_CATEGORIES as readonly string[]).includes(category) ? category : category,
    description:
      typeof body.description === "string" ? body.description.trim() || undefined : existing?.description,
    estimatedDurationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 60,
    laborHours: Number.isFinite(laborHours) && laborHours >= 0 ? laborHours : 1,
    startingPrice: Number.isFinite(startingPrice) && startingPrice >= 0 ? startingPrice : 0,
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl.trim() || undefined : existing?.photoUrl,
    warranty: typeof body.warranty === "string" ? body.warranty.trim() || undefined : existing?.warranty,
    faqs: Array.isArray(body.faqs) ? body.faqs : existing?.faqs ?? [],
    requiredParts: Array.isArray(body.requiredParts) ? body.requiredParts : existing?.requiredParts ?? [],
    optionalAddons: Array.isArray(body.optionalAddons) ? body.optionalAddons : existing?.optionalAddons ?? [],
    maintenanceIntervalMiles:
      body.maintenanceIntervalMiles != null && Number.isFinite(Number(body.maintenanceIntervalMiles))
        ? Number(body.maintenanceIntervalMiles)
        : existing?.maintenanceIntervalMiles,
    maintenanceIntervalMonths:
      body.maintenanceIntervalMonths != null && Number.isFinite(Number(body.maintenanceIntervalMonths))
        ? Number(body.maintenanceIntervalMonths)
        : existing?.maintenanceIntervalMonths,
    active: typeof body.active === "boolean" ? body.active : existing?.active ?? true,
    sortOrder:
      body.sortOrder != null && Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : existing?.sortOrder ?? 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export async function GET(req: Request) {
  return withPermission(["bookings.view", "work_orders.view"], async () => {
    try {
      const url = new URL(req.url);
      const activeOnly = url.searchParams.get("activeOnly") === "1";
      const items = await loadShopServices({ activeOnly });
      return NextResponse.json(items);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not load services." },
        { status: 400 },
      );
    }
  });
}

export async function POST(req: Request) {
  return withPermission("bookings.edit", async () => {
    try {
      const body = await req.json();
      const item = parseService(body);
      const saved = await upsertShopService(item);
      return NextResponse.json(saved);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not create service." },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(req: Request) {
  return withPermission("bookings.edit", async () => {
    try {
      const body = await req.json();
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      const existing = (await loadShopServices()).find((item) => item.id === id) ?? null;
      if (!existing) return NextResponse.json({ error: "Service not found." }, { status: 404 });
      const saved = await upsertShopService(parseService(body, existing));
      return NextResponse.json(saved);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update service." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("bookings.edit", async () => {
    try {
      const body = await req.json();
      const id = String(body.id ?? "").trim();
      if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
      await deleteShopService(id);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete service." },
        { status: 400 },
      );
    }
  });
}
