import { Suspense } from "react";
import { WargaShell } from "@/components/warga/warga-shell";
import { PesanChat } from "@/components/warga/pesan-chat";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Pesan — Lapor.ah",
  description: "Chat langsung dengan admin desa — bot template atau Kepala Desa",
};

export default function PesanPage() {
  return (
    <WargaShell>
      <div className="mb-8">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
          Komunikasi Langsung
        </p>
        <h1 className="font-display text-4xl tracking-tight mb-3">Pesan Admin Desa</h1>
        <p className="text-muted-foreground max-w-2xl">
          Tanya langsung ke admin desa. Pertanyaan populer dijawab bot otomatis; sisanya diteruskan ke
          Kepala Desa dengan notifikasi email & WhatsApp.
        </p>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <PesanChat />
      </Suspense>
    </WargaShell>
  );
}
