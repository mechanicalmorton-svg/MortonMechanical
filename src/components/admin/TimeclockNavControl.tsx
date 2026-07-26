"use client";

import { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import type { TimeEntry } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { usePermissions } from "./permissions";

type MinePayload = {
  open: TimeEntry | null;
  today: TimeEntry[];
  recent: TimeEntry[];
};

export const TIMECLOCK_CHANGED = "mm:timeclock-changed";

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function TimeclockNavControl() {
  const toast = useAdminToast();
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canClock = hasPermission("timeclock.clock");
  const canView = hasPermission("timeclock.view");

  const load = useCallback(async () => {
    if (!canView && !canClock) {
      setLoading(false);
      return;
    }
    const { data, error } = await adminGet<MinePayload>("/api/admin/timeclock?mine=1");
    if (!error) setOpen(data?.open ?? null);
    setLoading(false);
  }, [canClock, canView]);

  useEffect(() => {
    load();
    function onChanged() {
      load();
    }
    window.addEventListener(TIMECLOCK_CHANGED, onChanged);
    return () => window.removeEventListener(TIMECLOCK_CHANGED, onChanged);
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
      await load();
      window.dispatchEvent(new Event(TIMECLOCK_CHANGED));
    }
  }

  if (!canClock && !canView) return null;

  const clockedIn = Boolean(open);

  return (
    <div className="flex min-w-0 items-center gap-2">
      {canView && !loading ? (
        <span
          className={`hidden truncate text-xs sm:inline ${
            clockedIn ? "text-emerald-300" : "text-slate-500"
          }`}
          title={clockedIn ? `Clocked in since ${formatTime(open?.clockInAt)}` : "Not clocked in"}
        >
          {clockedIn ? `In · ${formatTime(open?.clockInAt)}` : "Out"}
        </span>
      ) : null}
      {canClock ? (
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => punch(clockedIn ? "out" : "in")}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50 sm:px-3 sm:text-sm ${
            clockedIn
              ? "border-red-500/40 bg-red-500/15 text-red-100 hover:bg-red-500/25"
              : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
          }`}
          aria-label={clockedIn ? "Clock out" : "Clock in"}
        >
          {clockedIn ? <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          <span>{busy ? "…" : clockedIn ? "Clock out" : "Clock in"}</span>
        </button>
      ) : null}
    </div>
  );
}
