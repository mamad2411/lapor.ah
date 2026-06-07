"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminProvider, useAdmin } from "./admin-context";
import { Spinner } from "@/components/ui/spinner";

function AdminGuardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading, error } = useAdmin();
  const [authChecked, setAuthChecked] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    const auth = getAuthClient();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/masuk");
      } else if (!token) {
        router.replace("/masuk");
      } else {
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, [router, token]);

  if (!authChecked || loading) {
    return (
      <Spinner
        fullscreen
        size="lg"
        text="Memverifikasi sesi admin..."
      />
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-semibold">Akses Ditolak</h2>
          <p className="text-sm text-muted-foreground">
            {error || "Token atau sesi tidak valid. Login ulang dari halaman masuk."}
          </p>
          <Button onClick={() => router.push("/masuk")}>Ke Halaman Masuk</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <Spinner
          fullscreen
          size="lg"
          text="Memuat Halaman Admin..."
        />
      }
    >
      <AdminProvider>
        <AdminGuardInner>{children}</AdminGuardInner>
      </AdminProvider>
    </Suspense>
  );
}
