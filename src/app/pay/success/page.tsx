import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PaySuccessClient } from "@/components/PaySuccessClient";

export const metadata: Metadata = {
  title: "Payment successful",
  description: "Your payment to Morton's Mechanical was received.",
};

export default function PaySuccessPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-slate-950 px-4 py-16 text-slate-100">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <h1 className="text-2xl font-bold text-white">Payment received</h1>
              <p className="mt-3 text-sm text-slate-300">Confirming your payment…</p>
            </div>
          }
        >
          <PaySuccessClient />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
