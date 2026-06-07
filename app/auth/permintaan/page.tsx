export const dynamic = "force-dynamic";

import { AuthShell } from "@/components/auth/auth-shell";
import { RequestAccessForm } from "@/components/auth/request-access-form";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

export const metadata = {
  title: "Permintaan Akses — Lapor.ah",
  description: "Ajukan link pendaftaran atau reset password Lapor.ah",
};

export default function PermintaanPage() {
  return (
    <>
      <Navigation />
      <main>
        <AuthShell>
          <RequestAccessForm />
        </AuthShell>
      </main>
      <FooterSection />
    </>
  );
}
