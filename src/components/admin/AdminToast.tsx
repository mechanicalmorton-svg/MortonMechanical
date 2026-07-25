"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
};

type AdminToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const AdminToastContext = createContext<AdminToastApi | null>(null);

const AUTO_DISMISS_MS = 4500;
const MAX_TOASTS = 4;

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/25 bg-emerald-950/90 text-emerald-50",
  error: "border-red-500/25 bg-red-950/90 text-red-50",
  info: "border-slate-600/40 bg-slate-900/95 text-slate-100",
};

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = icons[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 ease-out ${
        toast.exiting ? "translate-x-3 opacity-0" : "admin-toast-enter translate-x-0 opacity-100"
      } ${styles[toast.type]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-current opacity-60 transition hover:bg-white/10 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 220);
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      setToasts((prev) => {
        // Dedupe identical active toasts (panels often fire the same auth error together).
        if (prev.some((toast) => !toast.exiting && toast.type === type && toast.message === trimmed)) {
          return prev;
        }
        const id = crypto.randomUUID();
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
        return [...prev.slice(-(MAX_TOASTS - 1)), { id, type, message: trimmed }];
      });
    },
    [dismiss],
  );

  const value = useMemo<AdminToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) throw new Error("useAdminToast must be used within AdminToastProvider");
  return ctx;
}
