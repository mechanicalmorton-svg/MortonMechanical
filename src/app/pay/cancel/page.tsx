import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Payment cancelled",
  description: "Your payment was cancelled.",
};

export default function PayCancelPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[60vh] flex-1 items-center justify-center bg-slate-950 px-4 py-16 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/40 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Payment cancelled</h1>
          <p className="mt-3 text-sm text-slate-300">
            No charge was made. You can try again from the payment link, or call us if you need help.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-pink-500"
            >
              Contact us
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/60"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
