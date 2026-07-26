import { readJson, writeJson, newId } from "./store";
import { isSupabaseConfigured } from "./supabase/server";
import { requireAdminClient, requireDatabaseInProduction, throwOnError } from "./supabase/db";
import { auditDelete, auditUpsert } from "./audit-instrument";
import type { TimeEntry } from "./shop-types";

function useDatabase() {
  requireDatabaseInProduction();
  return isSupabaseConfigured();
}

function rowToTimeEntry(r: Record<string, unknown>): TimeEntry {
  return {
    id: r.id as string,
    staffId: (r.staff_id as string) ?? "",
    clockInAt: (r.clock_in_at as string) ?? "",
    clockOutAt: (r.clock_out_at as string) || undefined,
    note: (r.note as string) || undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
    editedBy: (r.edited_by as string) || undefined,
    editedAt: (r.edited_at as string) || undefined,
  };
}

function timeEntryToRow(e: TimeEntry) {
  return {
    id: e.id,
    staff_id: e.staffId,
    clock_in_at: e.clockInAt,
    clock_out_at: e.clockOutAt ?? null,
    note: e.note ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    edited_by: e.editedBy ?? null,
    edited_at: e.editedAt ?? null,
  };
}

export function createTimeEntryId() {
  return newId();
}

export async function loadTimeEntries(filters?: {
  staffId?: string;
  from?: string;
  to?: string;
}): Promise<TimeEntry[]> {
  if (useDatabase()) {
    let query = requireAdminClient()
      .from("time_entries")
      .select("*")
      .order("clock_in_at", { ascending: false });
    if (filters?.staffId) query = query.eq("staff_id", filters.staffId);
    if (filters?.from) query = query.gte("clock_in_at", filters.from);
    if (filters?.to) query = query.lte("clock_in_at", filters.to);
    const { data, error } = await query;
    throwOnError(error, "Could not load time entries");
    return (data ?? []).map(rowToTimeEntry);
  }

  let items = readJson<TimeEntry[]>("time-entries.json", []);
  if (filters?.staffId) items = items.filter((e) => e.staffId === filters.staffId);
  if (filters?.from) items = items.filter((e) => e.clockInAt >= filters.from!);
  if (filters?.to) items = items.filter((e) => e.clockInAt <= filters.to!);
  return items.sort((a, b) => b.clockInAt.localeCompare(a.clockInAt));
}

export async function getOpenTimeEntry(staffId: string): Promise<TimeEntry | null> {
  if (!staffId) return null;
  if (useDatabase()) {
    const { data, error } = await requireAdminClient()
      .from("time_entries")
      .select("*")
      .eq("staff_id", staffId)
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwOnError(error, "Could not load open time entry");
    return data ? rowToTimeEntry(data as Record<string, unknown>) : null;
  }
  return (await loadTimeEntries({ staffId })).find((e) => !e.clockOutAt) ?? null;
}

export async function upsertTimeEntry(item: TimeEntry) {
  const before =
    (await loadTimeEntries()).find((e) => e.id === item.id) ?? null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("time_entries").upsert(timeEntryToRow(item));
    throwOnError(error, "Could not save time entry");
  } else {
    const items = await loadTimeEntries();
    const idx = items.findIndex((e) => e.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    writeJson("time-entries.json", items);
  }
  void auditUpsert({
    module: "timeclock",
    recordType: "time_entry",
    recordId: item.id,
    recordLabel: item.staffId,
    before,
    after: item,
    createDescription: `Time entry created for ${item.staffId}`,
    updateDescription: `Time entry updated for ${item.staffId}`,
    page: "/admin#timesheets",
  });
}

export async function deleteTimeEntry(id: string) {
  const before = (await loadTimeEntries()).find((e) => e.id === id) ?? null;
  if (useDatabase()) {
    const { error } = await requireAdminClient().from("time_entries").delete().eq("id", id);
    throwOnError(error, "Could not delete time entry");
  } else {
    writeJson(
      "time-entries.json",
      (await loadTimeEntries()).filter((e) => e.id !== id),
    );
  }
  void auditDelete({
    module: "timeclock",
    recordType: "time_entry",
    recordId: id,
    recordLabel: before?.staffId,
    before,
    description: `Time entry deleted`,
    page: "/admin#timesheets",
  });
}
