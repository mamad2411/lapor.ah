"use client";

import { Suspense } from "react";
import { WilayahPageLive } from "@/components/dashboard-admin/wilayah-page-live";
import { Spinner } from "@/components/ui/spinner";

export default function AdminWilayahPage() {
  return (
    <Suspense
      fallback={
        <Spinner
          fullscreen
          size="lg"
          text="Memuat wilayah desa..."
        />
      }
    >
      <WilayahPageLive />
    </Suspense>
  );
}
