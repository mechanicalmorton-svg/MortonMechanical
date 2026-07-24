import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-slate-400 sm:text-base">{subtitle}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "amber",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "amber" | "pink" | "emerald" | "purple" | "red";
}) {
  const accents = {
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400 ring-amber-500/20",
    pink: "from-pink-500/20 to-pink-600/5 text-pink-400 ring-pink-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 ring-emerald-500/20",
    purple: "from-purple-500/20 to-purple-600/5 text-purple-400 ring-purple-500/20",
    red: "from-red-500/20 to-red-600/5 text-red-400 ring-red-500/20",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 transition hover:border-slate-700/80 hover:shadow-lg hover:shadow-black/20">
      <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-amber-500/5 to-pink-500/5 blur-2xl transition group-hover:from-amber-500/10 group-hover:to-pink-500/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function Panel({
  title,
  badge,
  children,
  action,
}: {
  title: string;
  badge?: number | string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-white">{title}</h2>
          {badge !== undefined && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">{badge}</span>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-500">
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-4 font-medium text-slate-300">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    open: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
    in_progress: "bg-purple-500/15 text-purple-300 ring-purple-500/25",
    confirmed: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    completed: "bg-slate-700/80 text-slate-300 ring-slate-600/40",
    cancelled: "bg-red-500/10 text-red-300 ring-red-500/20",
    urgent: "bg-red-500/15 text-red-300 ring-red-500/25",
    active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    maintenance: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    retired: "bg-slate-700 text-slate-400 ring-slate-600/40",
    planned: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
    new: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    read: "bg-slate-700 text-slate-300 ring-slate-600/40",
    archived: "bg-slate-800 text-slate-500 ring-slate-700/40",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${styles[status] ?? "bg-slate-800 text-slate-400 ring-slate-700"}`}>
      {label}
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-amber-400 hover:to-pink-500 disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/60";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-900/50 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/10";

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{message}</p>
  );
}
