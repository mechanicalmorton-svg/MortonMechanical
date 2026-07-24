"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { useEmailLogin?: boolean };

export function LoginForm({ useEmailLogin = false }: Props) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
      setError(data.error ?? "Login failed.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
        <h1 className="text-2xl font-bold text-white">Portal Login</h1>
        <p className="mt-2 text-sm text-slate-400">
          {useEmailLogin
            ? "Sign in with your Morton’s Mechanical email and password."
            : "Sign in to manage your shop website and quote requests."}
        </p>
        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
        )}
        <label className="mt-6 block text-sm font-medium text-slate-300">
          {useEmailLogin ? "Email" : "Username"}
          <input
            type={useEmailLogin ? "email" : "text"}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete={useEmailLogin ? "email" : "username"}
            required
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-300">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
