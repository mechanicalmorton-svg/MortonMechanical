import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { getContent } from "@/lib/content";
import { phoneHref } from "@/lib/content-types";

export async function Hero() {
  const { hero, site, images, header } = await getContent();

  return (
    <section className="relative isolate min-h-[min(92vh,900px)] overflow-hidden border-b border-slate-800/50">
      <Image
        src={images.hero}
        alt=""
        fill
        priority
        className="site-fade object-cover"
        sizes="100vw"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(245,158,11,0.12),transparent_45%)]" />

      <div className="relative mx-auto flex min-h-[min(92vh,900px)] max-w-screen-xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 sm:pb-20 lg:justify-center lg:pb-24 lg:pt-32">
        <div className="max-w-2xl">
          {hero.eyebrow ? (
            <p className="site-rise text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/90">
              {hero.eyebrow}
            </p>
          ) : null}

          <h1 className="site-rise site-rise-delay-1 site-display mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            {hero.title}{" "}
            <span className="bg-gradient-to-r from-amber-400 to-pink-500 bg-clip-text text-transparent">
              {hero.titleHighlight}
            </span>
          </h1>

          <p className="site-rise site-rise-delay-2 mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {hero.description}
          </p>

          <div className="site-rise site-rise-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/contact" className="site-btn-primary">
              {header.quoteButtonText}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a href={phoneHref(site.phone)} className="site-btn-secondary">
              <Phone className="h-4 w-4" aria-hidden />
              {header.callButtonText}
            </a>
          </div>

          <ul className="site-rise site-rise-delay-4 mt-10 grid gap-3 sm:grid-cols-2">
            {hero.bullets.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300/95">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="site-rise site-rise-delay-4 mt-12 max-w-md text-xs leading-relaxed tracking-wide text-slate-500 sm:mt-16">
          <span className="font-medium text-slate-400">{hero.imageCaption}</span>
          {hero.imageSubcaption ? ` · ${hero.imageSubcaption}` : null}
        </p>
      </div>
    </section>
  );
}
