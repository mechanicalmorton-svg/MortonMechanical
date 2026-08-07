"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import type { SiteContent } from "@/lib/content-types";
import { phoneHref } from "@/lib/content-types";

type Props = {
  name: string;
  phone: string;
  header: SiteContent["header"];
  logo?: string;
};

export function HeaderNav({ name, phone, header, logo }: Props) {
  const [open, setOpen] = useState(false);
  const tel = phoneHref(phone);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 transition hover:opacity-90">
          <SiteLogo size={44} showName name={name} src={logo} />
        </Link>

        <nav className="hidden md:block" aria-label="Main">
          <ul className="flex items-center gap-1 text-sm font-medium text-slate-300">
            {header.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative inline-flex rounded-full px-3.5 py-2 transition hover:text-amber-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <a
            href={tel}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {header.callButtonText}
          </a>
          <Link
            href="/client/login"
            className="inline-flex items-center rounded-full border border-cyan-700/50 px-4 py-2 text-sm font-semibold text-cyan-100/90 transition hover:border-cyan-500/50 hover:text-cyan-50"
          >
            Portal login
          </Link>
          <Link href="/contact" className="site-btn-primary !px-4 !py-2">
            {header.quoteButtonText}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700/70 text-slate-200 transition hover:bg-slate-800/50 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-white/5 bg-slate-950/95 px-4 py-4 backdrop-blur-xl md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {header.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-amber-300"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-3 flex flex-col gap-2 border-t border-slate-800/80 pt-3">
              <a href={tel} className="site-btn-secondary">
                <Phone className="h-4 w-4" />
                {header.callButtonText}
              </a>
              <Link href="/client/login" className="site-btn-secondary" onClick={() => setOpen(false)}>
                Portal login
              </Link>
              <Link href="/contact" className="site-btn-primary" onClick={() => setOpen(false)}>
                {header.quoteButtonText}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
