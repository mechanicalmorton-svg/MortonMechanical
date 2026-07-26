import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  deleteRoleDefinition,
  ensureDefaultRolesSeeded,
  loadRoleDefinitions,
  upsertRoleDefinition,
} from "@/lib/shop-data";
import { isValidRoleColor, normalizeRolePermissions } from "@/lib/role-definitions";

export async function GET() {
  return withPermission("roles.view", async () => {
    await ensureDefaultRolesSeeded();
    return NextResponse.json(await loadRoleDefinitions());
  });
}

export async function POST(req: Request) {
  return withPermission("roles.create", async () => {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Role name is required." }, { status: 400 });
    if (!isValidRoleColor(String(body.color ?? ""))) {
      return NextResponse.json({ error: "Pick a preset or custom hex color." }, { status: 400 });
    }
    try {
      const roles = await upsertRoleDefinition({
        name,
        color: body.color,
        permissions: normalizeRolePermissions(body.permissions),
        system: false,
      });
      return NextResponse.json(roles);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not create role." },
        { status: 400 },
      );
    }
  });
}

export async function PATCH(req: Request) {
  return withPermission("roles.edit", async () => {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!id) return NextResponse.json({ error: "Role id is required." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Role name is required." }, { status: 400 });
    if (body.color != null && !isValidRoleColor(String(body.color))) {
      return NextResponse.json({ error: "Pick a preset or custom hex color." }, { status: 400 });
    }
    try {
      const roles = await upsertRoleDefinition({
        id,
        name,
        color: body.color,
        permissions: body.permissions ? normalizeRolePermissions(body.permissions) : undefined,
      });
      return NextResponse.json(roles);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update role." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withPermission("roles.delete", async () => {
    const body = await req.json().catch(() => ({}));
    try {
      const roles = await deleteRoleDefinition(String(body.id ?? ""));
      return NextResponse.json(roles);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete role." },
        { status: 400 },
      );
    }
  });
}
