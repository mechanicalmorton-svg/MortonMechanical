import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContent } from "@/lib/content";

export async function CTA() {
  const { cta, images } = await getContent();

  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[340px] sm:min-h-[380px]">
        <Image
          src={images.contact}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(245,158,11,0.12),transparent_50%)]" />

        <div className="relative mx-auto flex min-h-[340px] max-w-screen-xl flex-col items-start justify-center px-4 py-20 sm:min-h-[380px] sm:px-6 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/90">Next step</p>
          <h2 className="site-display mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {cta.title}
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300">{cta.description}</p>
          <Link href="/contact" className="site-btn-primary mt-9">
            {cta.buttonText}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
