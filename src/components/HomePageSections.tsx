import { About } from "@/components/About";
import { CTA } from "@/components/CTA";
import { CustomBlockSection } from "@/components/CustomBlockSection";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Services } from "@/components/Services";
import { Testimonials } from "@/components/Testimonials";
import { TrustBar } from "@/components/TrustBar";
import { getContent } from "@/lib/content";
import {
  customBlockIdFromSection,
  isBuiltInSectionId,
  isCustomSectionId,
} from "@/lib/page-layout";

export async function HomePageSections() {
  const content = await getContent();

  return (
    <>
      {content.pageLayout.sections.map((section) => {
        if (!section.enabled) return null;

        if (isCustomSectionId(section.id)) {
          const block = content.customBlocks.find((b) => b.id === customBlockIdFromSection(section.id));
          if (!block) return null;
          return <CustomBlockSection key={section.id} block={block} align={section.align} />;
        }

        if (!isBuiltInSectionId(section.id)) return null;

        switch (section.id) {
          case "hero":
            return <Hero key={section.id} />;
          case "trustBar":
            return <TrustBar key={section.id} />;
          case "services":
            return <Services key={section.id} />;
          case "howItWorks":
            return <HowItWorks key={section.id} />;
          case "about":
            return <About key={section.id} />;
          case "testimonials":
            return <Testimonials key={section.id} />;
          case "cta":
            return <CTA key={section.id} />;
          default:
            return null;
        }
      })}
    </>
  );
}
