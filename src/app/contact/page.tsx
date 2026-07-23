import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { getContent } from "@/lib/content";
import { emailHref, phoneHref } from "@/lib/content-types";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getContent();
  return {
    title: pages.contactTitle,
    description: pages.contactSubtitle,
  };
}

export default async function ContactPage() {
  const { site, whyUs, images, pages, serviceOptions } = await getContent();

  return (
    <>
      <Header />
      <main className="min-h-[70vh] flex-1 bg-slate-950 text-slate-100">
        <div className="relative border-b border-slate-800/60">
          <div className="relative h-40 sm:h-48">
            <Image
              src={images.contact}
              alt=""
              fill
              priority
              className="object-cover opacity-30"
              sizes="100vw"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 to-slate-950" />
          </div>
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-screen-xl px-4 pb-8 sm:px-6">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pages.contactTitle}</h1>
              <p className="mt-2 max-w-xl text-slate-300">{pages.contactSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-6 sm:p-8 lg:col-span-2">
            <ContactForm serviceOptions={serviceOptions} />
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Contact details</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                  <div>
                    <p className="font-medium text-slate-300">Phone</p>
                    <a href={phoneHref(site.phone)} className="text-slate-100 transition hover:text-amber-400">
                      {site.phone}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                  <div>
                    <p className="font-medium text-slate-300">Email</p>
                    <a href={emailHref(site.email)} className="text-slate-100 transition hover:text-amber-400">
                      {site.email}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                  <div>
                    <p className="font-medium text-slate-300">Location</p>
                    <p className="text-slate-400">{site.address}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                  <div>
                    <p className="font-medium text-slate-300">Hours</p>
                    <ul className="mt-1 space-y-0.5 text-slate-400">
                      {site.hours.map((h) => (
                        <li key={h.days}>
                          {h.days}: {h.time}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Why book with us</h2>
              <ul className="mt-4 space-y-3">
                {whyUs.map((item) => (
                  <li key={item.title} className="text-sm">
                    <p className="font-medium text-slate-200">{item.title}</p>
                    <p className="text-slate-500">{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
