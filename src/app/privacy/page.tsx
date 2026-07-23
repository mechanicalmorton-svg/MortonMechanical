import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/content";
import { emailHref } from "@/lib/content-types";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default async function PrivacyPage() {
  const { site } = await getContent();
  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-slate-400">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <div className="mt-8 space-y-6 text-slate-300 leading-relaxed">
            <p>
              {site.name} (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains how we
              collect and use personal information when you contact us through this website.
            </p>
            <section>
              <h2 className="text-xl font-semibold text-white">Information we collect</h2>
              <p className="mt-2">
                When you submit a quote request, we collect your name, phone number, email (if provided),
                vehicle registration, service details, and any message you include.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">How we use it</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>To respond to your enquiry and provide a quote</li>
                <li>To schedule and perform mobile mechanic services</li>
                <li>To follow up about your booking or service</li>
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Sharing</h2>
              <p className="mt-2">
                We do not sell your personal information. We only share data when required by law or with
                service providers who help us operate our business.
              </p>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-white">Contact</h2>
              <p className="mt-2">
                Questions? Email us at{" "}
                <a href={emailHref(site.email)} className="text-amber-400 hover:underline">{site.email}</a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
