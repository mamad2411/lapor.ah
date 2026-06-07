"use client";

import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { PengaturanDesaForm } from "@/components/dashboard-admin/pengaturan-desa-form";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";

export default function AdminPengaturanPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeading
          label="Pengaturan"
          title="Konfigurasi desa"
          description="Atur identitas desa, kontak kantor, dan preferensi notifikasi."
        />
        <PengaturanDesaForm />
      </div>
    </AdminLayout>
  );
}
