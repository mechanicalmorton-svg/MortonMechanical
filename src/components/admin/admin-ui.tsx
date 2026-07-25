import type { LucideIcon } from "lucide-react";
import { getRoleBadgeClass, getRoleLabel } from "@/lib/admin-roles";
import {
  isHexColor,
  isRoleColor,
  normalizeRoleColor,
  resolveRoleColorHex,
  roleChipClassName,
} from "@/lib/role-definitions";
import type { StaffRole } from "@/lib/shop-types";

export function RoleBadge({
  role,
  roleName,
  roleColor,
  className = "",
}: {
  role: StaffRole;
  roleName?: string;
  roleColor?: string;
  className?: string;
}) {
  const label = roleName || getRoleLabel(role);
  const color = roleColor ? normalizeRoleColor(roleColor) : undefined;
  const isCustom = Boolean(color && isHexColor(color));
  const chip = color
    ? isCustom || isRoleColor(color)
      ? roleChipClassName(color)
      : getRoleBadgeClass(role)
    : getRoleBadgeClass(role);
  const hex = color ? resolveRoleColorHex(color) : undefined;
  const customStyle = isCustom && hex
    ? {
        background: `linear-gradient(180deg, ${hex}99, ${hex}33)`,
        borderColor: `${hex}88`,
      }
    : undefined;

  return (
    <span className={`admin-glass-chip ${chip} ${className}`} style={customStyle}>
      <span className="admin-glass-chip__sheen" aria-hidden />
      <span className="relative z-[1]">{label}</span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-rise mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/55">{eyebrow}</p>
        ) : null}
        <h1 className={`admin-glass-title admin-display ${eyebrow ? "mt-2" : ""}`}>
          <span className="admin-glass-title__sheen" aria-hidden />
          <span className="admin-glass-title__text">{title}</span>
        </h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
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

  const className = `group admin-glass-panel relative w-full overflow-hidden rounded-2xl p-5 text-left transition duration-300 ${
    active
      ? "admin-glass-panel--active"
      : "hover:-translate-y-0.5"
  } ${onClick ? "cursor-pointer" : ""}`;

  const content = (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70" />
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
    <section className="admin-glass admin-glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="admin-glass-title admin-glass-title--sm admin-display">
              <span className="admin-glass-title__sheen" aria-hidden />
              <span className="admin-glass-title__text">{title}</span>
            </h2>
            {badge !== undefined ? (
              <span className="admin-glass-chip admin-glass-chip--slate text-slate-200">
                <span className="admin-glass-chip__sheen" aria-hidden />
                <span className="relative z-[1]">{badge}</span>
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
    pending: "admin-glass-chip--amber text-amber-100",
    open: "admin-glass-chip--sky text-sky-100",
    normal: "admin-glass-chip--sky text-sky-100",
    overdue: "admin-glass-chip--red text-red-100",
    in_progress: "admin-glass-chip--fuchsia text-fuchsia-100",
    confirmed: "admin-glass-chip--emerald text-emerald-100",
    completed: "admin-glass-chip--slate text-slate-200",
    cancelled: "admin-glass-chip--red text-red-100",
    urgent: "admin-glass-chip--red text-red-100",
    active: "admin-glass-chip--emerald text-emerald-100",
    maintenance: "admin-glass-chip--amber text-amber-100",
    retired: "admin-glass-chip--slate text-slate-300",
    planned: "admin-glass-chip--sky text-sky-100",
    new: "admin-glass-chip--amber text-amber-100",
    read: "admin-glass-chip--slate text-slate-200",
    archived: "admin-glass-chip--slate text-slate-400",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span className={`admin-glass-chip ${styles[status] ?? "admin-glass-chip--slate text-slate-300"}`}>
      <span className="admin-glass-chip__sheen" aria-hidden />
      <span className="relative z-[1]">{label}</span>
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
