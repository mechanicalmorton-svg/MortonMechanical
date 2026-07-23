import { SectionLabel, SectionTitle } from "@/components/SectionHeader";
import { getContent } from "@/lib/content";

export async function HowItWorks() {
  const { howItWorks, sections } = await getContent();

  return (
    <section className="border-y border-slate-800/60 bg-slate-950 py-16 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <SectionLabel>{sections.howItWorks.label}</SectionLabel>
        <SectionTitle subtitle={sections.howItWorks.subtitle}>{sections.howItWorks.title}</SectionTitle>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {howItWorks.map((item) => (
            <li key={item.step} className="relative">
              <span className="text-5xl font-bold text-slate-800/80">{item.step}</span>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
