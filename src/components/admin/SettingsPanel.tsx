"use client";

import { useState } from "react";
import { ErrorBanner, PageHeader, btnPrimary, inputClass } from "./admin-ui";

type Props = { name: string };

export function SettingsPanel({ name }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update password.");
      return;
    }
    setMessage("Password updated successfully.");
    setPassword("");
    setConfirm("");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Site Settings" subtitle="Update your portal password." />

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <p className="text-sm text-slate-500">Signed in as</p>
        <p className="font-medium text-white">{name}</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="font-semibold text-white">Change password</h2>
        <ErrorBanner message={error} />
        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        <label className="mt-4 block text-sm text-slate-300">
          New password
          <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          Confirm new password
          <input type="password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        </label>
        <button type="submit" disabled={loading} className={`${btnPrimary} mt-4`}>
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
