"use client";

import { useEffect, useState } from "react";
import { AdminModal } from "./AdminModal";
import { btnPrimary, btnSecondary, inputClass } from "./admin-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<boolean> | boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  stacked?: boolean;
  busy?: boolean;
};

export function PasswordRequiredModal({
  open,
  onClose,
  onConfirm,
  title = "Password Required",
  description = "Enter the Founder password to continue.",
  confirmLabel = "Confirm",
  stacked,
  busy,
}: Props) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Enter the password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const ok = await onConfirm(password);
      if (!ok) setError("Incorrect password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify password.");
    } finally {
      setSubmitting(false);
    }
  }

  const loading = busy || submitting;

  return (
    <AdminModal open={open} onClose={onClose} title={title} stacked={stacked}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-400">{description}</p>
        <label className="block text-sm text-slate-300">
          <span className="font-medium text-slate-200">Password</span>
          <input
            className={`${inputClass} mt-1.5`}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Founder password"
            disabled={loading}
          />
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={loading || !password}>
            {loading ? "Checking…" : confirmLabel}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
