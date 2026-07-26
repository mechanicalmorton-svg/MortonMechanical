"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import type { TimeEntry } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { btnPrimary } from "./admin-ui";
import { Can, usePermissions } from "./permissions";

type MinePayload = {
  open: TimeEntry | null;
  today: TimeEntry[];
  recent: TimeEntry[];
};

function formatTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDuration(entry: TimeEntry) {
  const start = new Date(entry.clockInAt).getTime();
  const end = entry.clockOutAt ? new Date(entry.clockOutAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function TimeclockWidget() {
  const toast = useAdminToast();
  const { hasPermission } = usePermissions();
  const [payload, setPayload] = useState<MinePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!hasPermission("timeclock.view")) {
      setLoading(false);
      return;
    }
    const { data, error } = await adminGet<MinePayload>("/api/admin/timeclock?mine=1");
    if (error) toast.error(error);
    else setPayload(data);
    setLoading(false);
  }, [hasPermission, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function punch(action: "in" | "out") {
    setBusy(true);
    const { error } = await adminSend("/api/admin/timeclock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(action === "in" ? "Clocked in." : "Clocked out.");
      load();
    }
  }

  const open = payload?.open ?? null;
  const today = payload?.today ?? [];

  const canSee =
    hasPermission("dashboard.widget.timeclock") ||
    hasPermission("timeclock.clock") ||
    hasPermission("timeclock.view");

  if (!canSee) return null;

  return (
      <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40">
        <div className="h-1 bg-gradient-to-r from-sky-500 to-emerald-500" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Timeclock</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-white">
                <Clock className="h-5 w-5 text-sky-300" />
                {loading ? "Loading…" : open ? "Clocked in" : "Not clocked in"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {open
                  ? `Since ${formatTime(open.clockInAt)} · ${formatDuration(open)} so far`
                  : "Punch in when your shift starts. Times cannot be edited by you."}
              </p>
            </div>
            <Can permission="timeclock.clock">
              {open ? (
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy || loading}
                  onClick={() => punch("out")}
                >
                  <LogOut className="h-4 w-4" />
                  {busy ? "Saving…" : "Clock out"}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${btnPrimary} min-w-[9rem] justify-center`}
                  disabled={busy || loading}
                  onClick={() => punch("in")}
                >
                  <LogIn className="h-4 w-4" />
                  {busy ? "Saving…" : "Clock in"}
                </button>
              )}
            </Can>
          </div>

          <Can permission="timeclock.view">
            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Today</p>
              {!today.length ? (
                <p className="text-sm text-slate-500">No punches yet today.</p>
              ) : (
                <ul className="space-y-1.5">
                  {today.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
                    >
                      <span>
                        {formatTime(entry.clockInAt)}
                        {" → "}
                        {entry.clockOutAt ? formatTime(entry.clockOutAt) : "Open"}
                      </span>
                      <span className="text-xs text-slate-500">{formatDuration(entry)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Can>
        </div>
      </section>
  );
}
