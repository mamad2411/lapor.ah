"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { PengaturanTemplateForm } from "@/components/dashboard-admin/pengaturan-template-form";
import { AdminPesanInbox } from "@/components/dashboard-admin/admin-pesan-inbox";

export default function AdminPesanPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <SectionHeading
          label="Pesan Warga"
          title="Pesan & Template Balasan"
          description="Balas pesan warga yang diteruskan, dan atur template untuk pertanyaan populer."
        />
        <Suspense fallback={null}>
          <AdminPesanInbox />
        </Suspense>
        <Suspense fallback={null}>
          <PengaturanTemplateForm />
        </Suspense>
      </div>
    </AdminLayout>
  );
}
