"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Lock, Mail, Phone, UserRound } from "lucide-react";
import { PortalNavLinks } from "@/components/auth/PortalNavLinks";
import { SiteLogo } from "@/components/SiteLogo";
import { useAdminToast } from "@/components/admin/AdminToast";
import { btnPrimary, inputClass } from "@/components/admin/admin-ui";
import { useShopContact } from "@/lib/use-shop-contact";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
};

export function ClientAuthForm({ mode }: Props) {
  const toast = useAdminToast();
  const shop = useShopContact();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isRegister && password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const endpoint = isRegister ? "/api/client/register" : "/api/client/login";
    const body = isRegister
      ? { name: name.trim(), email: email.trim(), phone: phone.trim(), password }
      : { email: email.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        toast.error(data.error ?? (isRegister ? "Could not create account." : "Login failed."));
        return;
      }
      window.location.assign("/client");
    } catch {
      setLoading(false);
      toast.error(isRegister ? "Could not create account." : "Login failed.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="admin-soft-pulse absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-amber-600/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="absolute bottom-6 left-6 hidden sm:block">
        <SiteLogo
          size={48}
          showName
          subtitle="Client Portal"
          name={shop.businessName}
          src={shop.logos.customerPortal}
          scale={shop.logoScales.customerPortal}
        />
      </div>

      <div className="admin-rise relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <SiteLogo
              size={84}
              name={shop.businessName}
              src={shop.logos.customerPortal}
              scale={shop.logoScales.customerPortal}
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/85">Customer access</p>
          <h1 className="admin-glass-title admin-display mt-2">
            <span className="admin-glass-title__sheen" aria-hidden />
            <span className="admin-glass-title__text">{isRegister ? "Create your account" : "Client sign-in"}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {isRegister
              ? "Register with any email — Gmail, Outlook, iCloud, or your own domain."
              : "Sign in to view bookings, vehicles, and work on your vehicles."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="admin-glass rounded-3xl p-7 sm:p-8">
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            Client portal · any email provider welcome
          </div>

          {isRegister ? (
            <label className="block text-sm font-medium text-slate-300">
              Full name
              <div className="relative mt-1.5">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  className={`${inputClass} pl-10`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          ) : null}

          <label className={`block text-sm font-medium text-slate-300 ${isRegister ? "mt-4" : ""}`}>
            Email
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                className={`${inputClass} pl-10`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
                required
              />
            </div>
          </label>

          {isRegister ? (
            <label className="mt-4 block text-sm font-medium text-slate-300">
              Phone <span className="font-normal text-slate-500">(optional)</span>
              <div className="relative mt-1.5">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  className={`${inputClass} pl-10`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </label>
          ) : null}

          <label className="mt-4 block text-sm font-medium text-slate-300">
            Password
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                className={`${inputClass} pl-10`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                required
              />
            </div>
          </label>

          {isRegister ? (
            <label className="mt-4 block text-sm font-medium text-slate-300">
              Confirm password
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  className={`${inputClass} pl-10`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </label>
          ) : null}

          <button type="submit" disabled={loading} className={`${btnPrimary} mt-6 w-full py-3`}>
            {loading ? (isRegister ? "Creating account…" : "Signing in…") : isRegister ? "Create account" : "Sign in"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/client/login" className="text-cyan-300 transition hover:text-cyan-200">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/client/register" className="text-cyan-300 transition hover:text-cyan-200">
                Create a client account
              </Link>
            </>
          )}
        </p>

        <PortalNavLinks current="client" className="mt-4" />

        <p className="mt-4 text-center sm:hidden">
          <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-300">
            Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
