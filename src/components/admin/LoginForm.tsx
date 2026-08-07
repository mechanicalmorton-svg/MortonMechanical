"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck, Truck, Wrench } from "lucide-react";
import { PortalNavLinks } from "@/components/auth/PortalNavLinks";
import { SiteLogo } from "@/components/SiteLogo";
import { useShopContact } from "@/lib/use-shop-contact";
import { useAdminToast } from "./AdminToast";
import { btnPrimary, inputClass } from "./admin-ui";

export type LoginPortal = "admin" | "mechanic" | "dispatcher";

type Props = {
  useEmailLogin?: boolean;
  portal?: LoginPortal;
};

const PORTAL_COPY: Record<
  LoginPortal,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    secureNote: string;
    accentBlob: string;
    secondaryBlob: string;
    badge: string;
    Icon: typeof Wrench;
  }
> = {
  admin: {
    eyebrow: "Staff access",
    title: "Staff sign-in",
    subtitle: "Sign in to manage your shop website and day-to-day operations.",
    secureNote: "Secure portal · @mortonsmechanical.com accounts",
    accentBlob: "bg-amber-500/15",
    secondaryBlob: "bg-pink-600/15",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200/90",
    Icon: ShieldCheck,
  },
  mechanic: {
    eyebrow: "Shop floor",
    title: "Mechanic sign-in",
    subtitle: "Sign in to open work orders, inventory, and your assigned jobs.",
    secureNote: "Mechanic portal · @mortonsmechanical.com accounts",
    accentBlob: "bg-slate-400/20",
    secondaryBlob: "bg-sky-700/20",
    badge: "border-slate-400/25 bg-slate-500/15 text-slate-100",
    Icon: Wrench,
  },
  dispatcher: {
    eyebrow: "Dispatch desk",
    title: "Dispatcher sign-in",
    subtitle: "Sign in to manage bookings, routes, and today’s schedule.",
    secureNote: "Dispatcher portal · @mortonsmechanical.com accounts",
    accentBlob: "bg-emerald-500/20",
    secondaryBlob: "bg-teal-600/15",
    badge: "border-emerald-400/25 bg-emerald-500/15 text-emerald-100",
    Icon: Truck,
  },
};

export function LoginForm({ useEmailLogin = false, portal = "admin" }: Props) {
  const toast = useAdminToast();
  const shop = useShopContact();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const copy = PORTAL_COPY[portal];
  const Icon = copy.Icon;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = useEmailLogin
      ? { email: identifier.trim(), password, portal }
      : { username: identifier, password, portal };
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      toast.error(data.error ?? "Login failed.");
      return;
    }
    // Hard navigation so the browser sends the newly set auth cookies on /admin.
    // Soft router.push/refresh can race and bounce back to the login screen.
    window.location.assign("/admin");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className={`admin-soft-pulse absolute -left-24 top-10 h-80 w-80 rounded-full ${copy.accentBlob} blur-3xl`} />
        <div className={`absolute -right-16 bottom-0 h-96 w-96 rounded-full ${copy.secondaryBlob} blur-3xl`} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="absolute bottom-6 left-6 hidden sm:block">
        <SiteLogo
          size={48}
          showName
          name={shop.businessName}
          src={shop.logos.staffLogin}
          scale={shop.logoScales.staffLogin}
          subtitle={portal === "mechanic" ? "Mechanic Portal" : portal === "dispatcher" ? "Dispatcher Portal" : "Staff Portal"}
        />
      </div>

      <div className="admin-rise relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <SiteLogo
              size={84}
              name={shop.businessName}
              src={shop.logos.staffLogin}
              scale={shop.logoScales.staffLogin}
            />
          </div>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
              portal === "mechanic" ? "text-slate-300/90" : portal === "dispatcher" ? "text-emerald-400/85" : "text-amber-400/80"
            }`}
          >
            {copy.eyebrow}
          </p>
          <h1 className="admin-glass-title admin-display mt-2">
            <span className="admin-glass-title__sheen" aria-hidden />
            <span className="admin-glass-title__text">{copy.title}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {useEmailLogin && portal === "admin"
              ? "Sign in with your Morton’s Mechanical email to open the operations portal."
              : copy.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="admin-glass rounded-3xl p-7 sm:p-8">
          <div className={`mb-5 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${copy.badge}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {copy.secureNote}
          </div>

          <label className="block text-sm font-medium text-slate-300">
            {useEmailLogin ? "Email" : "Username"}
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={useEmailLogin ? "email" : "text"}
                className={`${inputClass} pl-10`}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete={useEmailLogin ? "email" : "username"}
                required
              />
            </div>
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-300">
            Password
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                className={`${inputClass} pl-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <button type="submit" disabled={loading} className={`${btnPrimary} mt-6 w-full py-3`}>
            {loading ? "Signing in…" : "Sign in"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>

        <PortalNavLinks current={portal} />

        <p className="mt-4 text-center sm:hidden">
          <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-300">
            Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
