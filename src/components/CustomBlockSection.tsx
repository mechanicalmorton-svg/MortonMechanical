import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CustomBlock, SectionAlign } from "@/lib/content-types";
import { alignClass } from "@/lib/page-layout";

export function CustomBlockSection({
  block,
  align = "left",
}: {
  block: CustomBlock;
  align?: SectionAlign;
}) {
  const hasImage = Boolean(block.imageUrl?.trim());
  const hasButton = Boolean(block.buttonText?.trim() && block.buttonHref?.trim());

  return (
    <section className="scroll-mt-24 border-y border-slate-800/40 py-20 sm:py-24">
      <div className={`mx-auto flex max-w-screen-xl flex-col gap-10 px-4 sm:px-6 ${alignClass(align)}`}>
        <div className={`max-w-2xl ${align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""}`}>
          {block.title ? (
            <h2 className="site-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {block.title}
            </h2>
          ) : null}
          {block.body ? (
            <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{block.body}</p>
          ) : null}
          {hasButton ? (
            <Link href={block.buttonHref} className="site-btn-primary mt-8">
              {block.buttonText}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
        {hasImage ? (
          <div
            className={`relative w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-slate-800/70 ${
              align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : ""
            }`}
          >
            <div className="relative aspect-[16/9]">
              <Image src={block.imageUrl} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 48rem" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
