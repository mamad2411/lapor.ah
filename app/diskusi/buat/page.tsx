import { WargaShell } from "@/components/warga/warga-shell";
import { DiskusiComposer } from "@/components/warga/diskusi-composer";

export const metadata = {
  title: "Buat Diskusi Baru — Lapor.ah",
  description: "Bagikan dan diskusikan masalah desa bersama warga lainnya.",
};

export default function BuatDiskusiPage() {
  return (
    <WargaShell>
      <div className="py-8">
        <DiskusiComposer />
      </div>
    </WargaShell>
  );
}
