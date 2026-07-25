import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomePageSections } from "@/components/HomePageSections";

/** Always read latest Site Contents after owner saves (no stale homepage cache). */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HomePageSections />
      </main>
      <Footer />
    </>
  );
}
