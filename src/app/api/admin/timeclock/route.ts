import { NextResponse } from "next/server";
import { withPermission } from "@/lib/admin-route";
import {
  createTimeEntryId,
  deleteTimeEntry,
  getOpenTimeEntry,
  loadTimeEntries,
  upsertTimeEntry,
} from "@/lib/timeclock-data";
import type { TimeEntry } from "@/lib/shop-types";

function parseIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";

  if (mine) {
    return withPermission("timeclock.view", async (user) => {
      const open = await getOpenTimeEntry(user.id);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const today = await loadTimeEntries({
        staffId: user.id,
        from: startOfDay.toISOString(),
      });
      const recent = await loadTimeEntries({ staffId: user.id });
      return NextResponse.json({
        open,
        today,
        recent: recent.slice(0, 14),
      });
    });
  }

  return withPermission("timeclock.workspace.timesheets", async () => {
    const staffId = url.searchParams.get("staffId")?.trim() || undefined;
    const from = url.searchParams.get("from")?.trim() || undefined;
    const to = url.searchParams.get("to")?.trim() || undefined;
    const entries = await loadTimeEntries({ staffId, from, to });
    return NextResponse.json(entries);
  });
}

export async function POST(req: Request) {
  return withPermission("timeclock.clock", async (user) => {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "").trim().toLowerCase();
    const now = new Date().toISOString();
    const open = await getOpenTimeEntry(user.id);

    if (action === "in") {
      if (open) {
        return NextResponse.json(
          { error: "You are already clocked in. Clock out before starting a new shift." },
          { status: 400 },
        );
      }
      const entry: TimeEntry = {
        id: createTimeEntryId(),
        staffId: user.id,
        clockInAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await upsertTimeEntry(entry);
      return NextResponse.json(entry);
    }

    if (action === "out") {
      if (!open) {
        return NextResponse.json({ error: "You are not clocked in." }, { status: 400 });
      }
      const updated: TimeEntry = {
        ...open,
        clockOutAt: now,
        updatedAt: now,
      };
      await upsertTimeEntry(updated);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Action must be 'in' or 'out'." }, { status: 400 });
  });
}

export async function PATCH(req: Request) {
  return withPermission("timeclock.edit", async (user) => {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "Entry id is required." }, { status: 400 });

    const items = await loadTimeEntries();
    const item = items.find((e) => e.id === id);
    if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const clockInAt = body.clockInAt !== undefined ? parseIso(body.clockInAt) : item.clockInAt;
    if (!clockInAt) {
      return NextResponse.json({ error: "Invalid clock-in time." }, { status: 400 });
    }

    let clockOutAt: string | undefined = item.clockOutAt;
    if (body.clockOutAt !== undefined) {
      if (body.clockOutAt === null || body.clockOutAt === "") clockOutAt = undefined;
      else {
        const parsed = parseIso(body.clockOutAt);
        if (!parsed) {
          return NextResponse.json({ error: "Invalid clock-out time." }, { status: 400 });
        }
        clockOutAt = parsed;
      }
    }

    if (clockOutAt && new Date(clockOutAt).getTime() < new Date(clockInAt).getTime()) {
      return NextResponse.json({ error: "Clock-out must be after clock-in." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updated: TimeEntry = {
      ...item,
      clockInAt,
      clockOutAt,
      note: body.note !== undefined ? String(body.note ?? "").trim() || undefined : item.note,
      updatedAt: now,
      editedBy: user.id,
      editedAt: now,
    };
    await upsertTimeEntry(updated);
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: Request) {
  return withPermission("timeclock.delete", async () => {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Entry id is required." }, { status: 400 });
    await deleteTimeEntry(String(id));
    return NextResponse.json({ ok: true });
  });
}
