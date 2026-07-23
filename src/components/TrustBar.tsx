import { Clock, MapPin, Shield, Wrench } from "lucide-react";
import { getContent } from "@/lib/content";

const icons = [MapPin, Clock, Shield, Wrench];

export async function TrustBar() {
  const { trustBar } = await getContent();

  return (
    <section className="border-b border-slate-800/60 bg-slate-900/30">
      <div className="mx-auto grid max-w-screen-xl grid-cols-2 gap-px bg-slate-800/40 sm:grid-cols-4">
        {trustBar.map(({ label, detail }, i) => {
          const Icon = icons[i % icons.length];
          return (
            <div key={label} className="flex items-center gap-3 bg-slate-950 px-4 py-5 sm:px-6">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
