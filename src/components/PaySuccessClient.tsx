"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ConfirmState = "checking" | "paid" | "pending" | "error";

export function PaySuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim() || "";
  const [state, setState] = useState<ConfirmState>(sessionId ? "checking" : "paid");
  const [message, setMessage] = useState(
    sessionId
      ? "Confirming your payment…"
      : "Thanks — your payment went through. We'll be in touch if anything else is needed.",
  );

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    let interval: number | undefined;

    async function confirm() {
      try {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          paid?: boolean;
          applied?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          setMessage(data.error || "We received your payment, but could not update the work order yet.");
          if (interval) window.clearInterval(interval);
          return;
        }
        if (data.paid) {
          setState("paid");
          setMessage(
            data.applied
              ? "Thanks — your payment went through and your work order has been updated."
              : "Thanks — your payment went through. We'll be in touch if anything else is needed.",
          );
          if (interval) window.clearInterval(interval);
          return;
        }
        setState("pending");
        setMessage("Payment is still processing. This page will keep checking for a moment.");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("We couldn't confirm the payment status automatically. If you were charged, you're all set.");
          if (interval) window.clearInterval(interval);
        }
      }
    }

    void confirm();
    interval = window.setInterval(() => {
      void confirm();
    }, 2500);
    const stop = window.setTimeout(() => {
      if (interval) window.clearInterval(interval);
    }, 45_000);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [sessionId]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
      <h1 className="text-2xl font-bold text-white">
        {state === "checking" || state === "pending" ? "Confirming payment…" : "Payment received"}
      </h1>
      <p className="mt-3 text-sm text-slate-300">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-pink-500"
      >
        Back to home
      </Link>
    </div>
  );
}
