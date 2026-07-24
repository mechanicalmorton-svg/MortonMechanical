import Image from "next/image";
import {
  Battery,
  Calendar,
  Cog,
  ScanLine,
  Shield,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { SectionLabel, SectionTitle } from "@/components/SectionHeader";
import { getContent } from "@/lib/content";
import type { ServiceIcon } from "@/lib/content-types";

const icons: Record<ServiceIcon, LucideIcon> = {
  scan: ScanLine,
  calendar: Calendar,
  shield: Shield,
  cog: Cog,
  battery: Battery,
  wind: Wind,
};

export async function Services() {
  const { services, images, sections } = await getContent();

  return (
    <section id={sections.services.anchorId} className="scroll-mt-24 bg-slate-900/40 py-16 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <SectionLabel>{sections.services.label}</SectionLabel>
        <SectionTitle subtitle={sections.services.subtitle}>{sections.services.title}</SectionTitle>

        <div className="relative mt-10 overflow-hidden rounded-2xl border border-slate-800/60">
          <div className="relative h-44 sm:h-52">
            <Image
              src={images.services}
              alt=""
              fill
              className="object-cover opacity-40"
              sizes="100vw"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute inset-0 flex items-center px-6 sm:px-8">
              <p className="max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                {sections.services.bannerText}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = icons[service.icon];
            return (
              <article
                key={service.id}
                className="group rounded-xl border border-slate-800/60 bg-slate-950/80 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-amber-500/25 hover:shadow-lg hover:shadow-black/20"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition group-hover:bg-amber-500/15">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-semibold text-slate-100">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{service.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
