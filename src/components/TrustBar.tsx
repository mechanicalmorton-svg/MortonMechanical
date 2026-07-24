import { Clock, MapPin, Shield, Wrench } from "lucide-react";
import { getContent } from "@/lib/content";

const icons = [MapPin, Clock, Shield, Wrench];

export async function TrustBar() {
  const { trustBar } = await getContent();

  return (
    <section className="border-b border-slate-800/50 bg-slate-950/80">
      <div className="mx-auto grid max-w-screen-xl gap-px sm:grid-cols-2 lg:grid-cols-4">
        {trustBar.map(({ label, detail }, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div
              key={label}
              className="group flex items-start gap-4 px-5 py-7 transition sm:px-6 sm:py-8"
            >
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 transition group-hover:border-amber-400/35 group-hover:bg-amber-500/15">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="site-display text-sm font-semibold tracking-tight text-slate-100">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
