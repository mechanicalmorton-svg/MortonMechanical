import { NextResponse } from "next/server";
import { withAdminAuth, withOwnerAdmin } from "@/lib/admin-route";
import { createPortalUser, deleteStaffMember, loadStaff, upsertStaffMember } from "@/lib/shop-data";
import type { StaffRole } from "@/lib/shop-types";

export async function GET() {
  return withAdminAuth(async () => NextResponse.json(await loadStaff()));
}

export async function POST(req: Request) {
  return withOwnerAdmin(async () => {
    const body = await req.json();
    const member = await createPortalUser({
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      phone: body.phone ?? "",
      role: (body.role ?? "mechanic") as StaffRole,
    });
    return NextResponse.json(member);
  });
}

export async function PATCH(req: Request) {
  return withAdminAuth(async () => {
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
  });
}

export async function DELETE(req: Request) {
  return withOwnerAdmin(async () => {
    const { id } = await req.json();
    await deleteStaffMember(id);
    return NextResponse.json({ ok: true });
  });
}
