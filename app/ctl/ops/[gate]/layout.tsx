"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { OpsProvider } from "@/components/superadmin/ops-context";
import { OpsLayout } from "@/components/superadmin/ops-layout";
import { Spinner } from "@/components/ui/spinner";

export default function OpsGateLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const gate = params.gate as string;
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [profile, setProfile] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/ops/v1/auth/verify")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || d.gate !== gate) {
          setState("fail");
          return;
        }
        setProfile({ email: d.email, name: d.name });
        setState("ok");
      })
      .catch(() => setState("fail"));
  }, [gate]);

  useEffect(() => {
    if (state === "fail") {
      router.replace("/");
    }
  }, [state, router]);

  if (state === "loading") {
    return (
      <Spinner
        fullscreen
        size="lg"
        text="Memverifikasi sesi superadmin..."
      />
    );
  }

  if (state === "fail" || !profile) {
    return null;
  }

  return (
    <OpsProvider gate={gate} email={profile.email} name={profile.name}>
      <OpsLayout>{children}</OpsLayout>
    </OpsProvider>
  );
}
