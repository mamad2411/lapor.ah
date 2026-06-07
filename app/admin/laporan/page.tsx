"use client";

import { Suspense } from "react";
import { LaporanPageLive } from "@/components/dashboard-admin/laporan-page-live";

export default function AdminLaporanPage() {
  return (
    <Suspense fallback={null}>
      <LaporanPageLive />
    </Suspense>
  );
}
