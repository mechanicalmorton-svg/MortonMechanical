import type { LucideIcon } from "lucide-react";
import { roleBadgeClass, roleLabels } from "@/lib/admin-roles";
import type { StaffRole } from "@/lib/shop-types";

export function RoleBadge({ role, className = "" }: { role: StaffRole; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${roleBadgeClass[role]} ${className}`}
    >
      {roleLabels[role]}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow = "Morton’s Mechanical",
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400/80">{eyebrow}</p>
        ) : null}
        <h1 className="admin-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "amber",
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "amber" | "pink" | "emerald" | "purple" | "red";
  onClick?: () => void;
  active?: boolean;
}) {
  const accents = {
    amber: "from-amber-500/25 to-amber-600/5 text-amber-300 ring-amber-400/25",
    pink: "from-pink-500/25 to-pink-600/5 text-pink-300 ring-pink-400/25",
    emerald: "from-emerald-500/25 to-emerald-600/5 text-emerald-300 ring-emerald-400/25",
    purple: "from-fuchsia-500/20 to-pink-600/5 text-fuchsia-300 ring-fuchsia-400/20",
    red: "from-red-500/25 to-red-600/5 text-red-300 ring-red-400/25",
  };

  const className = `group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${
    active
      ? "border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-slate-900/80 to-slate-950 ring-1 ring-amber-400/25 shadow-lg shadow-amber-950/20"
      : "border-slate-800/70 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/90 hover:-translate-y-0.5 hover:border-slate-700/80 hover:shadow-xl hover:shadow-black/30"
  } ${onClick ? "cursor-pointer" : ""}`;

  const content = (
    <>
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/10 to-pink-500/10 blur-2xl transition duration-500 group-hover:from-amber-500/20 group-hover:to-pink-500/15" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="admin-display mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
        </div>
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 shadow-inner ${accents[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function Panel({
  title,
  badge,
  children,
  action,
  description,
}: {
  title: string;
  badge?: number | string;
  children: React.ReactNode;
  action?: React.ReactNode;
  description?: string;
}) {
  return (
    <section className="admin-glass overflow-hidden rounded-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/70 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold tracking-tight text-white">{title}</h2>
            {badge !== undefined ? (
              <span className="rounded-full bg-slate-800/90 px-2 py-0.5 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700/80">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/30 px-6 py-14 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400 ring-1 ring-slate-700/70">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-base font-medium text-slate-200">{title}</p>
      {text ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{text}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    open: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
    normal: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
    overdue: "bg-red-500/15 text-red-300 ring-red-500/25",
    in_progress: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/25",
    confirmed: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    completed: "bg-slate-700/80 text-slate-300 ring-slate-600/40",
    cancelled: "bg-red-500/10 text-red-300 ring-red-500/20",
    urgent: "bg-red-500/15 text-red-300 ring-red-500/25",
    active: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    maintenance: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    retired: "bg-slate-700 text-slate-400 ring-slate-600/40",
    planned: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
    new: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    read: "bg-slate-700 text-slate-300 ring-slate-600/40",
    archived: "bg-slate-800 text-slate-500 ring-slate-700/40",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ${styles[status] ?? "bg-slate-800 text-slate-400 ring-slate-700"}`}
    >
      {label}
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 shadow-inner shadow-black/20 placeholder:text-slate-600 transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-950/30 transition duration-200 hover:from-amber-400 hover:to-pink-500 hover:shadow-amber-900/40 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/50 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition duration-200 hover:border-slate-600 hover:bg-slate-800/70 hover:text-white active:scale-[0.98]";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/15 active:scale-[0.98]";

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{message}</p>
  );
}
