import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-api";
import { createId, deleteStaffMember, loadStaff, upsertStaffMember } from "@/lib/shop-data";
import type { StaffMember } from "@/lib/shop-types";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json(await loadStaff());
}

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  const member: StaffMember = {
    id: createId(),
    name: body.name ?? "New staff",
    email: body.email ?? "",
    phone: body.phone ?? "",
    role: body.role ?? "mechanic",
    active: body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  await upsertStaffMember(member);
  return NextResponse.json(member);
}

export async function PATCH(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const body = await req.json();
  const items = await loadStaff();
  const item = items.find((s) => s.id === body.id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const updated = { ...item, ...body };
  await upsertStaffMember(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await req.json();
  await deleteStaffMember(id);
  return NextResponse.json({ ok: true });
}
