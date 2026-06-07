"use client";

import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

interface WargaShellProps {
  children: React.ReactNode;
  wide?: boolean;
}

export function WargaShell({ children, wide }: WargaShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10 overflow-x-hidden max-w-full">
      <Navigation />
      <main className={`flex-1 mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 w-full overflow-x-hidden ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
        {children}
      </main>
      <FooterSection />
    </div>
  );
}
