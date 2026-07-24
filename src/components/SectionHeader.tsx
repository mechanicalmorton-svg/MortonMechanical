export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/90">
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="site-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
        {children}
      </h2>
      {subtitle ? (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">{subtitle}</p>
      ) : null}
      <div className="site-hairline site-line mt-7 w-24 origin-left" aria-hidden />
    </div>
  );
}
