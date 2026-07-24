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
    <section id={sections.services.anchorId} className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <SectionLabel>{sections.services.label}</SectionLabel>
        <SectionTitle subtitle={sections.services.subtitle}>{sections.services.title}</SectionTitle>

        <div className="relative mt-12 overflow-hidden rounded-[1.75rem] border border-slate-800/60">
          <div className="relative h-52 sm:h-64">
            <Image
              src={images.services}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/30" />
            <div className="absolute inset-0 flex items-end px-6 py-8 sm:items-center sm:px-10">
              <p className="site-display max-w-lg text-lg font-medium leading-relaxed text-slate-100 sm:text-xl">
                {sections.services.bannerText}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const Icon = icons[service.icon];
            return (
              <article
                key={service.id}
                className="group border-t border-slate-800/70 pt-6 transition hover:border-amber-500/35"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/15 bg-amber-500/10 text-amber-400 transition group-hover:border-amber-400/30 group-hover:bg-amber-500/15">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="site-display mt-4 text-xl font-semibold tracking-tight text-white">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{service.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
