import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";

const adminSans = Outfit({
  subsets: ["latin"],
  variable: "--font-admin-sans",
  display: "swap",
});

const adminDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-admin-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Staff Portal",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${adminSans.variable} ${adminDisplay.variable} admin-shell min-h-screen text-slate-100 antialiased`}>
      {children}
    </div>
  );
}
