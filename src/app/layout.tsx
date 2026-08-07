import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { ContentLiveRefresh } from "@/components/ContentLiveRefresh";
import { getContent } from "@/lib/content";
import "./globals.css";

const appSans = Barlow({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const appDisplay = Barlow_Condensed({
  variable: "--font-app-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { site, images } = await getContent();
  const favicon = images.favicon?.trim() || "/favicon.ico";
  const logo = images.logo?.trim() || "/logo.png";
  return {
    title: { default: site.name, template: `%s | ${site.name}` },
    description: site.description,
    icons: {
      icon: [{ url: favicon, sizes: "any" }],
      apple: [{ url: logo }],
    },
    openGraph: { title: site.name, description: site.description, type: "website" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${appSans.variable} ${appDisplay.variable} h-full scroll-smooth`}>
      <body className="site-shell flex min-h-full flex-col font-sans text-slate-100 antialiased">
        {children}
        <ContentLiveRefresh />
      </body>
    </html>
  );
}
