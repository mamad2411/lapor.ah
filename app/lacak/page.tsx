import { Suspense } from "react";
import { WargaShell } from "@/components/warga/warga-shell";
import { LacakForm } from "@/components/warga/lacak-form";
import Link from "next/link";

export const metadata = {
  title: "Lacak Laporan — Lapor.ah",
  description: "Lacak status laporan anonim dengan nomor tiket dan PIN pelacakan",
};

export default function LacakPage() {
  return (
    <WargaShell>
      <div className="flex flex-col items-center">
        {/* Header — center */}
        <div className="w-full max-w-md text-center mb-8">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            Pelacakan Anonim
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-3">
            Lacak Laporan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Masukkan nomor tiket WBS dan PIN pelacakan untuk melihat status — apakah sudah
            dibaca admin, sedang diproses, atau selesai.
          </p>
          <Link
            href="/laporan"
            className="text-sm underline underline-offset-4 mt-3 inline-block text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Buat laporan baru
          </Link>
        </div>

        {/* Form — center, max lebar wajar */}
        <div className="w-full max-w-lg">
          <Suspense fallback={null}>
            <LacakForm />
          </Suspense>
        </div>
      </div>
    </WargaShell>
  );
}
