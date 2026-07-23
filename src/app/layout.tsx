import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PhoneFAB } from "@/components/PhoneFAB";
import { ContentLiveRefresh } from "@/components/ContentLiveRefresh";
import { getContent } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getContent();
  return {
    title: { default: site.name, template: `%s | ${site.name}` },
    description: site.description,
    openGraph: { title: site.name, description: site.description, type: "website" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth`}>
      <body className="flex min-h-full flex-col bg-slate-950 font-sans text-slate-100 antialiased">
        {children}
        <PhoneFAB />
        <ContentLiveRefresh />
      </body>
    </html>
  );
}
