import { CtaBand } from "@/components/landing/cta-band";
import { Farmers } from "@/components/landing/farmers";
import { Features } from "@/components/landing/features";
import { Hardware } from "@/components/landing/hardware";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ImpactSection } from "@/components/landing/impact-section";
import { Marquee } from "@/components/landing/marquee";
import { Problem } from "@/components/landing/problem";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteNav } from "@/components/landing/site-nav";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <Marquee />
        <Problem />
        <HowItWorks />
        <Features />
        <Hardware />
        <ImpactSection />
        <Farmers />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
