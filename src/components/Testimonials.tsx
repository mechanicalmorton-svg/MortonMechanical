import { SectionLabel, SectionTitle } from "@/components/SectionHeader";
import { getContent } from "@/lib/content";

function Initials({ name }: { name: string }) {
  const parts = name.replace(".", "").split(" ");
  const initials = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-pink-600/20 text-xs font-bold text-amber-300 ring-1 ring-amber-500/20">
      {initials}
    </span>
  );
}

export async function Testimonials() {
  const { testimonials, sections } = await getContent();

  return (
    <section id={sections.testimonials.anchorId} className="scroll-mt-24 bg-slate-900/40 py-16 sm:py-20">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
        <SectionLabel>{sections.testimonials.label}</SectionLabel>
        <SectionTitle subtitle={sections.testimonials.subtitle}>{sections.testimonials.title}</SectionTitle>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote
              key={t.name}
              className="flex flex-col rounded-xl border border-slate-800/60 bg-slate-950/80 p-5 transition hover:border-slate-700/80"
            >
              <p className="flex-1 text-sm leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-5 flex items-center gap-3 border-t border-slate-800/80 pt-4">
                <Initials name={t.name} />
                <cite className="not-italic">
                  <p className="text-sm font-semibold text-slate-100">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.location}</p>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
