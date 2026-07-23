import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { Services } from "@/components/Services";
import { HowItWorks } from "@/components/HowItWorks";
import { About } from "@/components/About";
import { Testimonials } from "@/components/Testimonials";
import { CTA } from "@/components/CTA";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Services />
        <HowItWorks />
        <About />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
