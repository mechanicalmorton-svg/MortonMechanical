import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import { ContentLiveRefresh } from "@/components/ContentLiveRefresh";
import { getContent } from "@/lib/content";
import "./globals.css";

const siteSans = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const siteDisplay = Syne({
  variable: "--font-site-display",
  subsets: ["latin"],
  display: "swap",
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
    <html lang="en" className={`${siteSans.variable} ${siteDisplay.variable} h-full scroll-smooth`}>
      <body className="site-shell flex min-h-full flex-col font-sans text-slate-100 antialiased">
        {children}
        <ContentLiveRefresh />
      </body>
    </html>
  );
}
