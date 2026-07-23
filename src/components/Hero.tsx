import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { getContent } from "@/lib/content";
import { phoneHref } from "@/lib/content-types";

export async function Hero() {
  const { hero, site, images } = await getContent();

  return (
    <section className="relative overflow-hidden border-b border-slate-800/60 bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.06),transparent_50%)]" />

      <div className="mx-auto grid max-w-screen-xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div className="relative z-10">
          <p className="mb-4 text-sm font-medium text-amber-400">{hero.eyebrow}</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl lg:leading-[1.1]">
            {hero.title}{" "}
            <span className="bg-gradient-to-r from-amber-400 to-pink-500 bg-clip-text text-transparent">
              {hero.titleHighlight}
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-400">{hero.description}</p>

          <ul className="mt-8 space-y-2.5">
            {hero.bullets.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-amber-400 hover:to-pink-500"
            >
              Request a free quote
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={phoneHref(site.phone)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/50 hover:text-amber-400"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {site.phone}
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl shadow-black/40">
            <Image
              src={images.hero}
              alt="Mechanic performing engine diagnostics on a vehicle"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
              <p className="text-sm font-medium text-slate-200">{hero.imageCaption}</p>
              <p className="mt-1 text-xs text-slate-400">{hero.imageSubcaption}</p>
            </div>
          </div>
          <div
            className="pointer-events-none absolute -bottom-4 -right-4 hidden h-24 w-24 rounded-2xl border border-amber-500/20 bg-amber-500/5 lg:block"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
