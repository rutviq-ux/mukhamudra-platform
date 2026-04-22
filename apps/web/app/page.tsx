import dynamic from "next/dynamic";
import { HeroSection } from "@/components/landing/hero-section";
import { BrandMarquee } from "@/components/landing/brand-marquee";


const ScrollProgress = dynamic(() =>
  import("@/components/landing/scroll-progress").then(
    (m) => m.ScrollProgress
  )
);

// Below-fold sections — dynamically imported for smaller initial bundle
const WhyFaceSection = dynamic(() =>
  import("@/components/landing/why-face-section").then(
    (m) => m.WhyFaceSection
  )
);
const MethodPillarsSection = dynamic(() =>
  import("@/components/landing/method-pillars-section").then(
    (m) => m.MethodPillarsSection
  )
);
const LiveSessionSection = dynamic(() =>
  import("@/components/landing/live-session-section").then(
    (m) => m.LiveSessionSection
  )
);
const HowItWorksSection = dynamic(() =>
  import("@/components/landing/how-it-works-section").then(
    (m) => m.HowItWorksSection
  )
);
const BreathingSection = dynamic(() =>
  import("@/components/landing/breathing-section").then(
    (m) => m.BreathingSection
  )
);
const PricingSection = dynamic(() =>
  import("@/components/landing/pricing-section").then(
    (m) => m.PricingSection
  )
);
const TestimonialsSection = dynamic(() =>
  import("@/components/landing/conversion-sections").then(
    (m) => m.TestimonialsSection
  )
);
const FaqSection = dynamic(() =>
  import("@/components/landing/conversion-sections").then(
    (m) => m.FaqSection
  )
);
const FinalCtaSection = dynamic(() =>
  import("@/components/landing/conversion-sections").then(
    (m) => m.FinalCtaSection
  )
);
const LeadPopup = dynamic(() =>
  import("@/components/landing/lead-popup").then((m) => m.LeadPopup)
);

export const metadata = {
  title: "Mukha Mudra | Live Face Yoga & Pranayama",
  description:
    "Live group face yoga and pranayama classes. 7 techniques, 8-stage breathwork, 3x/week. Join the practice.",
};

export default function HomePage() {
  return (
    <>
      <ScrollProgress />

      <div className="min-h-screen">
        <HeroSection />
        <BrandMarquee />
        <WhyFaceSection />
        <MethodPillarsSection />
        <LiveSessionSection />
        <HowItWorksSection />
        <BreathingSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCtaSection />
      </div>

      <LeadPopup />
    </>
  );
}
