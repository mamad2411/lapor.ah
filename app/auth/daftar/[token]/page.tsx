export const dynamic = "force-dynamic";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Daftar — Lapor.ah",
};

export default async function DaftarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell>
      <RegisterForm token={token} />
    </AuthShell>
  );
}
