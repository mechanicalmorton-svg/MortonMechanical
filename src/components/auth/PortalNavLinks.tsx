import Link from "next/link";

export type PortalNavId = "admin" | "mechanic" | "dispatcher" | "client";

const PORTAL_LINK_BASE =
  "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition";

const PORTALS: {
  id: PortalNavId;
  href: string;
  label: string;
  className: string;
}[] = [
  {
    id: "admin",
    href: "/admin/login",
    label: "Staff",
    className: `${PORTAL_LINK_BASE} border-amber-400/35 bg-amber-500/15 text-amber-100 hover:border-amber-300/50 hover:bg-amber-500/25`,
  },
  {
    id: "mechanic",
    href: "/mechanic/login",
    label: "Mechanic",
    className: `${PORTAL_LINK_BASE} border-slate-400/35 bg-slate-500/15 text-slate-100 hover:border-slate-300/50 hover:bg-slate-500/25`,
  },
  {
    id: "dispatcher",
    href: "/dispatcher/login",
    label: "Dispatcher",
    className: `${PORTAL_LINK_BASE} border-emerald-400/35 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/50 hover:bg-emerald-500/25`,
  },
  {
    id: "client",
    href: "/client/login",
    label: "Client",
    className: `${PORTAL_LINK_BASE} border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:border-cyan-300/50 hover:bg-cyan-500/25`,
  },
];

type Props = {
  /** Hide the current page’s portal from the switcher. */
  current: PortalNavId;
  className?: string;
};

export function PortalNavLinks({ current, className = "mt-5" }: Props) {
  const links = PORTALS.filter((portal) => portal.id !== current);

  return (
    <div className={`${className} space-y-2.5 text-center`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Portals</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {links.map((portal) => (
          <Link key={portal.id} href={portal.href} className={portal.className}>
            {portal.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
