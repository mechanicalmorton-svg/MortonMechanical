"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  stacked?: boolean;
  children: React.ReactNode;
};

export function AdminModal({ open, onClose, title, wide, stacked, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4 ${stacked ? "z-[160]" : "z-[150]"}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className={`admin-rise relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-700/70 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/50 sm:rounded-3xl ${wide ? "max-w-4xl" : "max-w-xl"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400/70">Portal</p>
            <h2 id="admin-modal-title" className="admin-display mt-0.5 text-xl font-semibold tracking-tight text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950/50 p-2 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
