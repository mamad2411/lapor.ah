import { WargaShell } from "@/components/warga/warga-shell";
import { LaporanForm } from "@/components/warga/laporan-form";
import { RiwayatLaporan } from "@/components/warga/riwayat-laporan";
import Link from "next/link";

export const metadata = {
  title: "Buat Laporan — Lapor.ah",
  description: "Laporkan permasalahan lingkungan desa secara anonim",
};

export default function LaporanBuatPage() {
  return (
    <WargaShell>
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-8 w-full order-2 lg:order-1">
          <div className="mb-8">
            <h1 className="font-display text-4xl lg:text-5xl tracking-tight mb-3">
              Buat Laporan
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
              Laporkan masalah lingkungan desa tanpa identitas. Pilih desa tujuan, tandai lokasi di peta,
              lampirkan bukti, dan lacak status dengan nomor tiket.
            </p>
            <Link href="/laporan/lacak" className="text-sm underline underline-offset-4 mt-2 inline-block">
              Sudah punya tiket? Lacak di sini →
            </Link>
          </div>
          <LaporanForm />
        </div>
        
        <aside className="w-full lg:sticky lg:top-24 order-1 lg:order-2">
          <RiwayatLaporan />
        </aside>
      </div>
    </WargaShell>
  );
}
