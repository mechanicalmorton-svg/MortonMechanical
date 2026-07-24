import { SectionLabel, SectionTitle } from "@/components/SectionHeader";
import { getContent } from "@/lib/content";

function Initials({ name }: { name: string }) {
  const parts = name.replace(".", "").split(" ");
  const initials = parts
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-pink-600/15 text-xs font-bold text-amber-300">
      {initials}
    </span>
  );
}

export async function Testimonials() {
  const { testimonials, sections } = await getContent();

  return (
    <section
      id={sections.testimonials.anchorId}
      className="scroll-mt-24 border-y border-slate-800/50 bg-slate-950/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <SectionLabel>{sections.testimonials.label}</SectionLabel>
        <SectionTitle subtitle={sections.testimonials.subtitle}>{sections.testimonials.title}</SectionTitle>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="flex flex-col border-t border-amber-500/20 pt-6">
              <p className="site-display flex-1 text-lg font-medium leading-relaxed text-slate-200">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-8 flex items-center gap-3">
                <Initials name={t.name} />
                <cite className="not-italic">
                  <p className="text-sm font-semibold text-slate-100">{t.name}</p>
                  <p className="text-xs tracking-wide text-slate-500">{t.location}</p>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
