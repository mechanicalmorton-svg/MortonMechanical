import { NextResponse } from "next/server";
import { canManageUsers } from "@/lib/admin-roles";
import { withAdminAuth } from "@/lib/admin-route";
import {
  addInventoryCategory,
  deleteInventoryCategory,
  loadInventoryCategories,
} from "@/lib/shop-data";
import { isDefaultInventoryCategory } from "@/lib/inventory-categories";

export async function GET() {
  return withAdminAuth(async () => {
    const categories = await loadInventoryCategories();
    return NextResponse.json({
      categories,
      custom: categories.filter((name) => !isDefaultInventoryCategory(name)),
    });
  });
}

export async function POST(req: Request) {
  return withAdminAuth(async (user) => {
    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: "Only the owner or an admin can create inventory categories." },
        { status: 403 },
      );
    }
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
  return withAdminAuth(async (user) => {
    if (!canManageUsers(user.role)) {
      return NextResponse.json(
        { error: "Only the owner or an admin can delete inventory categories." },
        { status: 403 },
      );
    }
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
