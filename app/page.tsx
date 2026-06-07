import dynamic from "next/dynamic";
import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";

const FeaturesSection = dynamic(
  () =>
    import("@/components/landing/features-section").then((m) => ({
      default: m.FeaturesSection,
    })),
  { loading: () => null }
);
const HowItWorksSection = dynamic(
  () =>
    import("@/components/landing/how-it-works-section").then((m) => ({
      default: m.HowItWorksSection,
    })),
  { loading: () => null }
);
const InfrastructureSection = dynamic(
  () =>
    import("@/components/landing/infrastructure-section").then((m) => ({
      default: m.InfrastructureSection,
    })),
  { loading: () => null }
);
const MetricsSection = dynamic(
  () =>
    import("@/components/landing/metrics-section").then((m) => ({
      default: m.MetricsSection,
    })),
  { loading: () => null }
);
const IntegrationsSection = dynamic(
  () =>
    import("@/components/landing/integrations-section").then((m) => ({
      default: m.IntegrationsSection,
    })),
  { loading: () => null }
);
const SecuritySection = dynamic(
  () =>
    import("@/components/landing/security-section").then((m) => ({
      default: m.SecuritySection,
    })),
  { loading: () => null }
);
const AdminPanelSection = dynamic(
  () =>
    import("@/components/landing/developers-section").then((m) => ({
      default: m.AdminPanelSection,
    })),
  { loading: () => null }
);
const TestimonialsSection = dynamic(
  () =>
    import("@/components/landing/testimonials-section").then((m) => ({
      default: m.TestimonialsSection,
    })),
  { loading: () => null }
);
const FaqSection = dynamic(
  () =>
    import("@/components/landing/faq-section").then((m) => ({
      default: m.FaqSection,
    })),
  { loading: () => null }
);
const CtaSection = dynamic(
  () =>
    import("@/components/landing/cta-section").then((m) => ({
      default: m.CtaSection,
    })),
  { loading: () => null }
);
const FooterSection = dynamic(
  () =>
    import("@/components/landing/footer-section").then((m) => ({
      default: m.FooterSection,
    })),
  { loading: () => null }
);

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <Navigation />
      <HeroSection />
      <div className="landing-below-fold">
        <FeaturesSection />
        <HowItWorksSection />
        <InfrastructureSection />
        <MetricsSection />
        <IntegrationsSection />
        <SecuritySection />
        <AdminPanelSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
        <FooterSection />
      </div>
    </main>
  );
}
