import { SectionLabel, SectionTitle } from "@/components/SectionHeader";
import { getContent } from "@/lib/content";

export async function HowItWorks() {
  const { howItWorks, sections } = await getContent();

  return (
    <section
      id={sections.howItWorks.anchorId}
      className="scroll-mt-24 border-y border-slate-800/50 bg-slate-950/60 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <SectionLabel>{sections.howItWorks.label}</SectionLabel>
        <SectionTitle subtitle={sections.howItWorks.subtitle}>{sections.howItWorks.title}</SectionTitle>

        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <div
            className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent md:block"
            aria-hidden
          />
          {howItWorks.map((item) => (
            <li key={item.step} className="relative">
              <span className="site-display relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/25 bg-slate-950 text-lg font-semibold text-amber-400 shadow-[0_0_0_8px_rgba(2,6,23,1)]">
                {item.step}
              </span>
              <h3 className="site-display mt-6 text-xl font-semibold tracking-tight text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
