import Link from "next/link";
import { SiteLogo } from "@/components/SiteLogo";
import { getContent } from "@/lib/content";

export async function Footer() {
  const { site, footer, header } = await getContent();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-800/50 bg-slate-950">
      <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <SiteLogo size={40} showName name={site.name} />
            <p className="mt-4 text-sm leading-relaxed text-slate-500">{site.description}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 sm:gap-14">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Explore</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
                {header.nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="transition hover:text-amber-400">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Company</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
                <li>
                  <Link href="/contact" className="transition hover:text-amber-400">
                    {footer.contactLabel}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition hover:text-amber-400">
                    {footer.privacyLabel}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-amber-400">
                    {footer.termsLabel}
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-slate-500 transition hover:text-slate-300">
                    {footer.staffLoginLabel}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="site-hairline mt-10" aria-hidden />
        <p className="mt-6 text-center text-xs text-slate-600 md:text-left">
          &copy; {year} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
