import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import { isFounder } from "@/lib/permissions/service";
import {
  addInventoryCategory,
  deleteInventoryCategory,
  loadInventoryCategories,
  loadInventoryCategorySettings,
  updateInventoryCategoryFlags,
} from "@/lib/shop-data";
import { isDefaultInventoryCategory } from "@/lib/inventory-categories";

export async function GET() {
  return withPermission("inventory.view", async () => {
    const [categories, settings] = await Promise.all([
      loadInventoryCategories(),
      loadInventoryCategorySettings(),
    ]);
    return NextResponse.json({
      categories,
      custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
      settings,
    });
  });
}

export async function POST(req: Request) {
  return withPermission("inventory.adjust", async () => {
    const body = await req.json().catch(() => ({}));
    try {
      const categories = await addInventoryCategory(String(body.name ?? ""));
      const settings = await loadInventoryCategorySettings();
      return NextResponse.json({
        categories,
        custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
        settings,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not add category." },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(req: Request) {
  return withPermission("inventory.adjust", async (user) => {
    if (!isFounder(user)) {
      return NextResponse.json(
        { error: "Only a Founder can change category visibility settings." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    try {
      const result = await updateInventoryCategoryFlags(String(body.name ?? ""), {
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        showInWorkOrders: typeof body.showInWorkOrders === "boolean" ? body.showInWorkOrders : undefined,
      });
      return NextResponse.json({
        categories: result.categories,
        custom: result.categories.filter((name) => !isDefaultInventoryCategory(name)),
        settings: result.settings,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update category settings." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("inventory.adjust", async () => {
    const body = await req.json().catch(() => ({}));
    try {
      const categories = await deleteInventoryCategory(String(body.name ?? ""));
      const settings = await loadInventoryCategorySettings();
      return NextResponse.json({
        categories,
        custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
        settings,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete category." },
        { status: 400 },
      );
    }
  });
}
