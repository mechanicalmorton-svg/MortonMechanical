import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getContent } from "@/lib/content";

export async function CTA() {
  const { cta, images } = await getContent();

  return (
    <section className="relative overflow-hidden border-t border-slate-800/60">
      <div className="relative min-h-[280px]">
        <Image
          src={images.contact}
          alt=""
          fill
          className="object-cover opacity-25"
          sizes="100vw"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/70" />

        <div className="relative mx-auto max-w-screen-xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">{cta.title}</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-400">{cta.description}</p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-amber-400 hover:to-pink-500"
          >
            {cta.buttonText}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
