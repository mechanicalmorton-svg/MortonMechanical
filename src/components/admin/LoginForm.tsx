"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { useAdminToast } from "./AdminToast";
import { btnPrimary, inputClass } from "./admin-ui";

type Props = { useEmailLogin?: boolean };

export function LoginForm({ useEmailLogin = false }: Props) {
  const router = useRouter();
  const toast = useAdminToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = useEmailLogin
      ? { email: identifier.trim(), password }
      : { username: identifier, password };
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Login failed.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="admin-soft-pulse absolute -left-24 top-10 h-80 w-80 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-pink-600/15 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="absolute bottom-6 left-6 hidden sm:block">
        <SiteLogo size={48} showName subtitle="Staff Portal" />
      </div>

      <div className="admin-rise relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <SiteLogo size={84} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400/80">Staff access</p>
          <h1 className="admin-display mt-2 text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {useEmailLogin
              ? "Sign in with your Morton’s Mechanical email to open the operations portal."
              : "Sign in to manage your shop website and day-to-day operations."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="admin-glass rounded-3xl p-7 sm:p-8">
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200/90">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Secure portal · @mortonsmechanical.com accounts
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

        <p className="mt-6 text-center sm:hidden">
          <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-300">
            Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
