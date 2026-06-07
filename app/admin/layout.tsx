import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/dashboard-admin/admin-auth-guard";

export const metadata: Metadata = {
  title: "Panel Admin — Lapor.ah",
  description: "Dashboard perangkat desa untuk menerima dan menindaklanjuti laporan masyarakat.",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      {children}
    </AdminAuthGuard>
  );
}
