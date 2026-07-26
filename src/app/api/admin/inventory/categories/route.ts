import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  addInventoryCategory,
  deleteInventoryCategory,
  loadInventoryCategories,
} from "@/lib/shop-data";
import { isDefaultInventoryCategory } from "@/lib/inventory-categories";

export async function GET() {
  return withPermission("inventory.view", async () => {
    const categories = await loadInventoryCategories();
    return NextResponse.json({
      categories,
      custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
    });
  });
}

export async function POST(req: Request) {
  return withPermission("inventory.adjust", async () => {
    const body = await req.json().catch(() => ({}));
    try {
      const categories = await addInventoryCategory(String(body.name ?? ""));
      return NextResponse.json({
        categories,
        custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not add category." },
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
      return NextResponse.json({
        categories,
        custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete category." },
        { status: 400 },
      );
    }
  });
}
