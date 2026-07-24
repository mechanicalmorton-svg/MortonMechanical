"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { phoneHref } from "@/lib/content-types";

type Props = {
  name: string;
  phone: string;
};

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#reviews", label: "Reviews" },
];

export function HeaderNav({ name, phone }: Props) {
  const [open, setOpen] = useState(false);
  const tel = phoneHref(phone);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <SiteLogo size={44} showName name={name} />
        </Link>

        <nav className="hidden md:block" aria-label="Main">
          <ul className="flex items-center gap-8 text-sm font-medium text-slate-300">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-amber-400">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <a
            href={tel}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-500/50 hover:text-amber-400"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call Now
          </a>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-500/50 hover:text-amber-400"
          >
            Portal
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-amber-400 hover:to-pink-500"
          >
            Request Quote
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 text-slate-200 transition hover:bg-slate-800/50 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-800/60 px-4 py-4 md:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 border-t border-slate-800 pt-3">
              <a
                href={tel}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200"
                onClick={() => setOpen(false)}
              >
                Portal
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Request Quote
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
