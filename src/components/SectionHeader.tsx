export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
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
      <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">{children}</h2>
      {subtitle && <p className="mt-3 text-lg leading-relaxed text-slate-400">{subtitle}</p>}
    </div>
  );
}
