"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Eye, Pencil, Trash2 } from "lucide-react";
import type { StaffMember, TimeEntry } from "@/lib/shop-types";
import { adminGet, adminSend, asStaffList } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

type DaySheet = {
  key: string;
  staffId: string;
  day: string;
  punches: TimeEntry[];
  firstIn: string;
  lastOut?: string;
  totalMinutes: number;
  hasOpen: boolean;
  editedAt?: string;
};

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatStamp(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDayLabel(day: string) {
  try {
    return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return day;
  }
}

function formatMinutes(mins: number, hasOpen?: boolean) {
  if (!Number.isFinite(mins) || mins < 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const base = h <= 0 ? `${m}m` : `${h}h ${m}m`;
  return hasOpen ? `${base} · open` : base;
}

function punchMinutes(entry: TimeEntry) {
  const start = new Date(entry.clockInAt).getTime();
  const end = entry.clockOutAt ? new Date(entry.clockOutAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 60000);
}

function formatDuration(entry: TimeEntry) {
  if (!entry.clockOutAt) return "Open";
  return formatMinutes(punchMinutes(entry));
}

function groupByStaffDay(entries: TimeEntry[]): DaySheet[] {
  const map = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const key = `${entry.staffId}::${dayKey(entry.clockInAt)}`;
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }

  const sheets: DaySheet[] = [];
  for (const [key, punches] of map) {
    const sorted = [...punches].sort((a, b) => a.clockInAt.localeCompare(b.clockInAt));
    const [staffId, day] = key.split("::");
    const firstIn = sorted[0]?.clockInAt ?? "";
    const closedOuts = sorted.map((p) => p.clockOutAt).filter(Boolean) as string[];
    const lastOut = closedOuts.length
      ? closedOuts.sort((a, b) => b.localeCompare(a))[0]
      : undefined;
    const hasOpen = sorted.some((p) => !p.clockOutAt);
    const totalMinutes = sorted.reduce((sum, p) => sum + punchMinutes(p), 0);
    const editedAt = sorted
      .map((p) => p.editedAt)
      .filter(Boolean)
      .sort((a, b) => (b || "").localeCompare(a || ""))[0];
    sheets.push({
      key,
      staffId,
      day,
      punches: sorted,
      firstIn,
      lastOut,
      totalMinutes,
      hasOpen,
      editedAt,
    });
  }

  return sheets.sort((a, b) => {
    const dayCmp = b.day.localeCompare(a.day);
    if (dayCmp !== 0) return dayCmp;
    return a.staffId.localeCompare(b.staffId);
  });
}

export function TimesheetsPanel() {
  const toast = useAdminToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyStaffId, setHistoryStaffId] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<TimeEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (staffId) params.set("staffId", staffId);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    const [entryRes, staffRes] = await Promise.all([
      adminGet<TimeEntry[]>(`/api/admin/timeclock?${params.toString()}`),
      adminGet<StaffMember[] | { staff: StaffMember[] }>("/api/admin/staff"),
    ]);
    if (entryRes.error) toast.error(entryRes.error);
    else setEntries(entryRes.data ?? []);
    if (!staffRes.error) setStaff(asStaffList<StaffMember>(staffRes.data));
    setLoading(false);
  }, [staffId, from, to, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const staffName = useMemo(() => {
    const map = new Map(staff.map((s) => [s.id, s.name]));
    return (id: string) => map.get(id) || id.slice(0, 8);
  }, [staff]);

  const daySheets = useMemo(() => groupByStaffDay(entries), [entries]);

  const historyByDay = useMemo(() => groupByStaffDay(historyEntries), [historyEntries]);

  async function openHistory(id: string) {
    setHistoryStaffId(id);
    setHistoryLoading(true);
    const { data, error } = await adminGet<TimeEntry[]>(
      `/api/admin/timeclock?staffId=${encodeURIComponent(id)}`,
    );
    if (error) toast.error(error);
    else setHistoryEntries(data ?? []);
    setHistoryLoading(false);
  }

  function openEdit(entry: TimeEntry) {
    setEditing(entry);
    setEditIn(toLocalInput(entry.clockInAt));
    setEditOut(toLocalInput(entry.clockOutAt));
    setEditNote(entry.note || "");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await adminSend("/api/admin/timeclock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        clockInAt: editIn ? new Date(editIn).toISOString() : undefined,
        clockOutAt: editOut ? new Date(editOut).toISOString() : null,
        note: editNote,
      }),
    });
    setSaving(false);
    if (error) toast.error(error);
    else {
      toast.success("Timesheet updated.");
      setEditing(null);
      await load();
      if (historyStaffId) void openHistory(historyStaffId);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this clock punch?")) return;
    const { error } = await adminSend("/api/admin/timeclock", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Punch deleted.");
      await load();
      if (historyStaffId) void openHistory(historyStaffId);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <PageHeader
          title="Timesheets"
          subtitle="One row per person per day. Open the eye to view history and edit or delete punches."
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">All staff</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <input className={inputClass} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className={inputClass} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className={btnSecondary} onClick={() => load()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading timesheets…</p>
      ) : !daySheets.length ? (
        <EmptyState
          icon={Clock}
          title="No time entries"
          text="Clock punches in this range will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">Day</th>
                <th className="px-4 py-3 font-semibold">First in</th>
                <th className="px-4 py-3 font-semibold">Last out</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Punches</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {daySheets.map((sheet) => (
                <tr key={sheet.key} className="bg-slate-900/30 text-slate-300">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{staffName(sheet.staffId)}</p>
                    {sheet.editedAt ? (
                      <p className="text-[11px] text-amber-300/80">Edited {formatStamp(sheet.editedAt)}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDayLabel(sheet.day)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatStamp(sheet.firstIn)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {sheet.lastOut ? formatStamp(sheet.lastOut) : sheet.hasOpen ? "Open" : "—"}
                  </td>
                  <td className="px-4 py-3">{formatMinutes(sheet.totalMinutes, sheet.hasOpen)}</td>
                  <td className="px-4 py-3">{sheet.punches.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={btnSecondary}
                        title="View full clock history"
                        aria-label={`View history for ${staffName(sheet.staffId)}`}
                        onClick={() => openHistory(sheet.staffId)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={Boolean(historyStaffId)}
        onClose={() => {
          setHistoryStaffId(null);
          setHistoryEntries([]);
        }}
        title={historyStaffId ? `${staffName(historyStaffId)} — clock history` : "Clock history"}
        wide
      >
        {historyLoading ? (
          <p className="text-slate-500">Loading history…</p>
        ) : !historyByDay.length ? (
          <EmptyState icon={Clock} title="No punches yet" text="This person has no clock history." />
        ) : (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            {historyByDay.map((sheet) => (
              <section
                key={sheet.key}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-white">{formatDayLabel(sheet.day)}</p>
                  <p className="text-xs text-slate-500">
                    {sheet.punches.length} punch{sheet.punches.length === 1 ? "" : "es"} ·{" "}
                    {formatMinutes(sheet.totalMinutes, sheet.hasOpen)}
                  </p>
                </div>
                <ul className="space-y-2">
                  {sheet.punches.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/70 bg-slate-900/40 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-slate-200">
                          {formatStamp(entry.clockInAt)}
                          {" → "}
                          {entry.clockOutAt ? formatStamp(entry.clockOutAt) : "Open"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDuration(entry)}
                          {entry.note ? ` · ${entry.note}` : ""}
                          {entry.editedAt ? ` · Edited ${formatStamp(entry.editedAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Can permission="timeclock.edit">
                          <button type="button" className={btnSecondary} onClick={() => openEdit(entry)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                        </Can>
                        <Can permission="timeclock.delete">
                          <button type="button" className={btnDanger} onClick={() => remove(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Can>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </AdminModal>

      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit clock punch">
        {editing ? (
          <form onSubmit={saveEdit} className="space-y-3">
            <p className="text-sm text-slate-400">{staffName(editing.staffId)}</p>
            <label className="block text-xs text-slate-500">
              Clock in
              <input
                className={`${inputClass} mt-1`}
                type="datetime-local"
                value={editIn}
                onChange={(e) => setEditIn(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-slate-500">
              Clock out
              <input
                className={`${inputClass} mt-1`}
                type="datetime-local"
                value={editOut}
                onChange={(e) => setEditOut(e.target.value)}
              />
            </label>
            <label className="block text-xs text-slate-500">
              Note
              <input
                className={`${inputClass} mt-1`}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional correction note"
              />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </AdminModal>
    </div>
  );
}
