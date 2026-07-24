import Image from "next/image";
import { SectionLabel, SectionTitle } from "@/components/SectionHeader";
import { getContent } from "@/lib/content";

export async function About() {
  const { about, whyUs, images } = await getContent();

  return (
    <section id={about.anchorId} className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-slate-800/70 sm:aspect-[5/4]">
              <Image
                src={images.about}
                alt={about.imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/10" />
            </div>
            <div className="mt-6 flex items-end gap-3 border-l border-amber-500/40 pl-4">
              <p className="site-display text-4xl font-semibold tracking-tight text-amber-400">
                {about.badgeValue}
              </p>
              <p className="pb-1 text-xs uppercase tracking-[0.18em] text-slate-500">{about.badgeLabel}</p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionLabel>{about.label}</SectionLabel>
            <SectionTitle subtitle={about.subtitle}>{about.title}</SectionTitle>
            <p className="mt-8 leading-relaxed text-slate-300">{about.paragraph1}</p>
            <p className="mt-4 leading-relaxed text-slate-400">{about.paragraph2}</p>

            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {whyUs.map((item) => (
                <li key={item.title} className="border-t border-slate-800/70 pt-4">
                  <p className="site-display text-sm font-semibold tracking-tight text-slate-100">{item.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
