import { WargaShell } from "@/components/warga/warga-shell";
import { LacakForm } from "@/components/warga/lacak-form";
import { RiwayatLaporan } from "@/components/warga/riwayat-laporan";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Lacak Laporan — Lapor.ah",
  description: "Lacak status laporan WBS dengan nomor tiket dan PIN",
};

export default function LaporanLacakPage() {
  return (
    <WargaShell>
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-8 w-full order-2 lg:order-1">
          <div className="mb-8 text-center">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Pelacakan Anonim
            </p>
            <h1 className="font-display text-4xl tracking-tight mb-3">Lacak Laporan</h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
              Masukkan nomor tiket WBS dan PIN pelacakan untuk melihat status — apakah sudah dibaca admin,
              sedang diproses, atau selesai.
            </p>
            <Link href="/laporan/buat" className="text-sm underline underline-offset-4 mt-2 inline-block">
              ← Buat laporan baru
            </Link>
          </div>
          
          <Suspense fallback={<div className="h-40 flex items-center justify-center">Memuat form...</div>}>
            <LacakForm />
          </Suspense>
        </div>

        <aside className="w-full lg:sticky lg:top-24 order-1 lg:order-2">
          <RiwayatLaporan />
        </aside>
      </div>
    </WargaShell>
  );
}
