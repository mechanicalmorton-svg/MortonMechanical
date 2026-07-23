import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Portal",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {children}
    </div>
  );
}
