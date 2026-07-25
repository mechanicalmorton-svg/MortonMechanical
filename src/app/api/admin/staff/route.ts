import { NextResponse } from "next/server";
import { withAdminAuth, withOwnerAdmin } from "@/lib/admin-route";
import { normalizeRoleIds, pickPrimaryRoleId } from "@/lib/role-definitions";
import { assertStaffMutationAllowed, ROLE_IDS_SQL, staffMultiRoleReady } from "@/lib/staff-auth";
import {
  createPortalUser,
  deleteStaffMember,
  loadStaff,
  updateStaffMember,
} from "@/lib/shop-data";
import type { StaffMember, StaffRole } from "@/lib/shop-types";

function roleIdsFromBody(body: { role?: unknown; roleIds?: unknown }) {
  return normalizeRoleIds(body.roleIds, body.role ?? "mechanic") as StaffRole[];
}

function findMember(staff: StaffMember[], id: string) {
  return staff.find((member) => member.id === id);
}

export async function GET() {
  return withAdminAuth(async () => {
    const [staff, multiRoleReady] = await Promise.all([loadStaff(), staffMultiRoleReady()]);
    return NextResponse.json({
      staff,
      multiRoleReady,
      roleIdsSql: multiRoleReady ? undefined : ROLE_IDS_SQL,
    });
  });
}

export async function POST(req: Request) {
  return withOwnerAdmin(async () => {
    const body = await req.json();
    const roleIds = roleIdsFromBody(body);
    const member = await createPortalUser({
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      phone: body.phone ?? "",
      role: pickPrimaryRoleId(roleIds) as StaffRole,
      roleIds,
    });
    const { auditUpsert } = await import("@/lib/audit-instrument");
    void auditUpsert({
      module: "staff",
      recordType: "staff",
      recordId: member.id,
      recordLabel: member.name,
      before: null,
      after: { ...member, password: "[set]" },
      createDescription: `Staff user created: ${member.name}`,
      updateDescription: `Staff user created: ${member.name}`,
      page: "/admin#users",
    });
    return NextResponse.json(member);
  });
}

export async function PATCH(req: Request) {
  return withOwnerAdmin(async (user) => {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "User id is required." }, { status: 400 });

    const staff = await loadStaff();
    const target = findMember(staff, id);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const patch: Parameters<typeof updateStaffMember>[1] = {};
    if (body.name !== undefined) patch.name = String(body.name);
    if (body.email !== undefined) patch.email = String(body.email);
    if (body.phone !== undefined) patch.phone = String(body.phone);
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.password !== undefined && String(body.password).length > 0) {
      patch.password = String(body.password);
    }
    if (body.roleIds !== undefined || body.role !== undefined) {
      const roleIds = roleIdsFromBody(body);
      patch.roleIds = roleIds;
      patch.role = pickPrimaryRoleId(roleIds) as StaffRole;
    }

    try {
      assertStaffMutationAllowed(user.id, target, staff, {
        active: patch.active,
        roleIds: patch.roleIds,
        role: patch.role,
      });
      const member = await updateStaffMember(id, patch);
      return NextResponse.json(member);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update user." },
        { status: 400 },
      );
    }
  });
}

export async function DELETE(req: Request) {
  return withOwnerAdmin(async (user) => {
    const { id } = await req.json();
    const targetId = String(id ?? "").trim();
    if (!targetId) return NextResponse.json({ error: "User id is required." }, { status: 400 });

    const staff = await loadStaff();
    const target = findMember(staff, targetId);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    try {
      assertStaffMutationAllowed(user.id, target, staff, { deleting: true });
      await deleteStaffMember(targetId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not delete user." },
        { status: 400 },
      );
    }
  });
}
