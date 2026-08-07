import Image from "next/image";
import { scaledLogoSize } from "@/lib/content-types";

export const SITE_LOGO = "/logo.png";
export const SITE_NAME = "Morton's Mechanical";

type Props = {
  size?: number;
  className?: string;
  showName?: boolean;
  name?: string;
  subtitle?: string;
  /** Uploaded logo from Site Contents. Falls back to the bundled logo. */
  src?: string;
  /** Display size from Site Contents, as a percentage of `size`. */
  scale?: number;
};

export function SiteLogo({
  size = 40,
  className = "",
  showName = false,
  name = SITE_NAME,
  subtitle,
  src,
  scale = 100,
}: Props) {
  const rendered = scaledLogoSize(size, scale);
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <Image
        src={src?.trim() || SITE_LOGO}
        alt={name}
        width={rendered}
        height={rendered}
        className="shrink-0 rounded-full object-cover"
        priority
        unoptimized
      />
      {showName && (
        <span className="min-w-0">
          <span className="block truncate font-bold text-amber-400">{name}</span>
          {subtitle ? <span className="block truncate text-xs text-slate-500">{subtitle}</span> : null}
        </span>
      )}
    </span>
  );
}
