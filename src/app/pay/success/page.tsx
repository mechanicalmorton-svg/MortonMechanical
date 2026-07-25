import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Payment successful",
  description: "Your payment to Morton's Mechanical was received.",
};

export default function PaySuccessPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-slate-950 px-4 py-16 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Payment received</h1>
          <p className="mt-3 text-sm text-slate-300">
            Thanks — your payment went through. We&apos;ll be in touch if anything else is needed.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-pink-500"
          >
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
