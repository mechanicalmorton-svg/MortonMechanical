import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/content";
import { emailHref, phoneHref } from "@/lib/content-types";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default async function TermsPage() {
  const { site } = await getContent();
  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Terms of Service</h1>
          <p className="mt-4 text-slate-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <div className="mt-8 space-y-6 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white">Services</h2>
              <p className="mt-2">
                {site.name} provides mobile automotive repair and maintenance services. Quotes are
                estimates based on information provided and may change after on-site inspection.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Bookings</h2>
              <p className="mt-2">
                Appointments are confirmed by phone or email. We reserve the right to reschedule due to
                weather, parts availability, or emergencies.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Payment</h2>
              <p className="mt-2">
                Payment terms are agreed before work begins. Prices include labour unless otherwise stated;
                parts are charged at cost plus a fair markup.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Warranty</h2>
              <p className="mt-2">
                We provide a 12-month workmanship warranty on labour. Parts are covered by manufacturer
                or supplier warranties where applicable.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Contact</h2>
              <p className="mt-2">
                Questions? Email <a href={emailHref(site.email)} className="text-amber-400 hover:underline">{site.email}</a> or call{" "}
                <a href={phoneHref(site.phone)} className="text-amber-400 hover:underline">{site.phone}</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
