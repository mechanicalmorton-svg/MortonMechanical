import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Portal",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell min-h-dvh text-slate-100 antialiased">{children}</div>;
}
