import Link from "next/link";
import { getContent } from "@/lib/content";

export async function Footer() {
  const { site } = await getContent();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:px-6 md:flex-row">
        <div className="text-center md:text-left">
          <p className="text-slate-400">
            &copy; {year} {site.name}. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-slate-500">{site.description}</p>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="text-slate-400 transition hover:text-amber-400">
            Privacy
          </Link>
          <Link href="/terms" className="text-slate-400 transition hover:text-amber-400">
            Terms
          </Link>
          <Link href="/contact" className="text-slate-400 transition hover:text-amber-400">
            Contact
          </Link>
          <Link href="/admin" className="text-slate-600 transition hover:text-slate-400">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
