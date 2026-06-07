"use client";

import { Suspense } from "react";
import { LaporanBulananLive } from "@/components/dashboard-admin/laporan-bulanan-live";
import { Spinner } from "@/components/ui/spinner";

export default function AdminLaporanBulananPage() {
  return (
    <Suspense
      fallback={
        <Spinner
          fullscreen
          size="lg"
          text="Memuat laporan bulanan..."
        />
      }
    >
      <LaporanBulananLive />
    </Suspense>
  );
}
