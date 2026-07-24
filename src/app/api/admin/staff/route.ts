import { NextResponse } from "next/server";
import { requireAuth, requireOwnerOrAdmin } from "@/lib/admin-api";
import { createPortalUser, deleteStaffMember, loadStaff, upsertStaffMember } from "@/lib/shop-data";
import type { StaffRole } from "@/lib/shop-types";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json(await loadStaff());
}

export async function POST(req: Request) {
  const { error } = await requireOwnerOrAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const member = await createPortalUser({
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      phone: body.phone ?? "",
      role: (body.role ?? "mechanic") as StaffRole,
    });
    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not create user." }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const member = await upsertStaffMember({
      id: body.id,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role,
      active: body.active,
      createdAt: body.createdAt,
    });
    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update user." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { error } = await requireOwnerOrAdmin();
  if (error) return error;
  try {
    const { id } = await req.json();
    await deleteStaffMember(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not delete user." }, { status: 400 });
  }
}
