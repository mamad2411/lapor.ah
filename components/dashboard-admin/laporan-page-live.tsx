"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "./admin-layout";
import { SectionHeading } from "./section-heading";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase/client";
import { Spinner } from "@/components/ui/spinner";
import { useAdmin } from "./admin-context";
import { toast } from "sonner";

type ApiLaporan = {
  id: string;
  ticketId: string;
  villageName: string;
  kategori: string;
  kategoriAsli: string;
  subKategori: string;
  deskripsi: string;
  tingkatUrgensi: string;
  status: string;
  adminRead: boolean;
  blockchainHash: string;
  createdAt: string;
};

const STATUS_MAP: Record<string, string> = {
  submitted: "Belum di Proses",
  dibaca: "Dibaca Admin",
  diproses: "Sedang di Proses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export function LaporanPageLive() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const villageId = searchParams.get("id");
  const { adminHref } = useAdmin();
  const [laporan, setLaporan] = useState<ApiLaporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Real-time listener untuk daftar laporan
  useEffect(() => {
    const db = getDbClient();
    let q = query(collection(db, "laporan"), orderBy("createdAt", "desc"), limit(200));
    
    if (villageId) {
      q = query(collection(db, "laporan"), where("villageId", "==", villageId), orderBy("createdAt", "desc"), limit(200));
    }

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          kategoriAsli: d.kategoriAsli || d.kategori,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        } as ApiLaporan;
      });
      setLaporan(list);
      setLoading(false);
    }, (err) => {
      console.error("Laporan list listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [villageId]);

  async function updateStatus(id: string, status: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    // Optimistic Update
    const original = [...laporan];
    setLaporan(prev => prev.map(l => l.id === id ? { ...l, status } : l));

    try {
      const res = await fetch("/api/admin/laporan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Gagal update");
      toast.success(`Status diperbarui ke ${STATUS_MAP[status]}`);
    } catch (err) {
      setLaporan(original);
      toast.error("Gagal memperbarui status");
    }
  }

  function openDetail(id: string) {
    router.push(adminHref(`/admin/laporan/${id}`));
  }

  const filtered = laporan.filter(
    (l) =>
      !search ||
      l.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      l.deskripsi.toLowerCase().includes(search.toLowerCase()) ||
      l.kategori.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout showSearch searchQuery={search} onSearchChange={setSearch}>
      <div className="space-y-6">
        <SectionHeading
          label="Pengaduan WBS"
          title="Semua laporan masyarakat"
          description="Klik laporan untuk melihat detail lengkap dan memberi tanggapan."
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" text="Memuat daftar laporan..." />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Belum ada laporan masuk</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => (
              <div
                key={l.id}
                onClick={() => openDetail(l.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-colors hover:bg-muted/40 ${
                  !l.adminRead ? "border-primary/30 bg-primary/5" : "bg-background"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{l.ticketId}</span>
                      <Badge variant={l.tingkatUrgensi === "Darurat" ? "destructive" : "secondary"}>
                        {l.tingkatUrgensi}
                      </Badge>
                      {!l.adminRead && (
                        <Badge className="bg-primary/20 text-primary border-0">Baru</Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      {l.kategoriAsli === "Lainnya" && l.subKategori
                        ? <><span className="text-muted-foreground">Lainnya</span> · <span className="font-medium">{l.subKategori}</span></>
                        : l.kategori
                      }
                      {" · "}{l.villageName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.deskripsi}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-2 truncate max-w-md">
                      ⛓ {l.blockchainHash?.slice(0, 24)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="outline">{STATUS_MAP[l.status] || l.status}</Badge>
                    <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v, { stopPropagation: () => {} } as React.MouseEvent)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["submitted", "dibaca", "diproses", "selesai", "ditolak"].map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_MAP[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
