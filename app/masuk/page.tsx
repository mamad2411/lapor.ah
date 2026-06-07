export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export const metadata = {
  title: "Masuk — Lapor.ah",
  description: "Masuk ke platform pelaporan masyarakat desa Lapor.ah",
};

export default function MasukPage() {
  return (
    <>
      <Navigation />
      <main>
        <AuthShell>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </AuthShell>
      </main>
      <FooterSection />
    </>
  );
}
