"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Trash2 } from "lucide-react";
import type { StaffMember, TimeEntry } from "@/lib/shop-types";
import { adminGet, adminSend, asStaffList } from "./admin-fetch";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, btnDanger, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can } from "./permissions";

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function formatDuration(entry: TimeEntry) {
  if (!entry.clockOutAt) return "Open";
  const start = new Date(entry.clockInAt).getTime();
  const end = new Date(entry.clockOutAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
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
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this timesheet entry?")) return;
    const { error } = await adminSend("/api/admin/timeclock", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (error) toast.error(error);
    else {
      toast.success("Entry deleted.");
      load();
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <PageHeader
          title="Timesheets"
          subtitle="Review staff clock in/out times. Employees cannot edit their own punches."
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
      ) : !entries.length ? (
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
                <th className="px-4 py-3 font-semibold">Clock in</th>
                <th className="px-4 py-3 font-semibold">Clock out</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {entries.map((entry) => (
                <tr key={entry.id} className="bg-slate-900/30 text-slate-300">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{staffName(entry.staffId)}</p>
                    {entry.editedAt ? (
                      <p className="text-[11px] text-amber-300/80">Edited {formatStamp(entry.editedAt)}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatStamp(entry.clockInAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatStamp(entry.clockOutAt)}</td>
                  <td className="px-4 py-3">{formatDuration(entry)}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-slate-400">{entry.note || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit timesheet entry">
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
