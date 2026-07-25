import Image from "next/image";

export const SITE_LOGO = "/logo.png";
export const SITE_NAME = "Morton's Mechanical";

type Props = {
  size?: number;
  className?: string;
  showName?: boolean;
  name?: string;
  subtitle?: string;
};

export function SiteLogo({
  size = 40,
  className = "",
  showName = false,
  name = SITE_NAME,
  subtitle,
}: Props) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <Image
        src={SITE_LOGO}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full"
        priority
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
