import { Phone } from "lucide-react";
import { getContent } from "@/lib/content";
import { phoneHref } from "@/lib/content-types";

export async function PhoneFAB() {
  const { site } = await getContent();

  return (
    <a
      href={phoneHref(site.phone)}
      className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-pink-600 text-white shadow-lg md:hidden"
      aria-label={`Call ${site.phone}`}
    >
      <Phone className="h-6 w-6" aria-hidden />
    </a>
  );
}
