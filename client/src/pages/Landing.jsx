import { SiteHeader } from "../components/landing/SiteHeader.jsx";
import { HeroSection } from "../components/landing/HeroSection.jsx";
import { ReasonsSection } from "../components/landing/ReasonsSection.jsx";
import { TestimonialsSection } from "../components/landing/TestimonialsSection.jsx";
import { InfoBanner } from "../components/landing/InfoBanner.jsx";
import { HowItWorks } from "../components/landing/HowItWorks.jsx";
import { BestFeatures } from "../components/landing/BestFeatures.jsx";
import { FaqSection } from "../components/landing/FaqSection.jsx";
import { SiteFooter } from "../components/landing/SiteFooter.jsx";

export default function Landing() {
  return (
    <div className="landing min-h-screen bg-white">
      <SiteHeader />
      <main>
        <HeroSection />
        <ReasonsSection />
        <TestimonialsSection />
        <InfoBanner />
        <HowItWorks />
        <BestFeatures />
        <FaqSection />
      </main>
      <SiteFooter />
    </div>
  );
}
