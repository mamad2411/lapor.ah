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
import { Spinner } from "@/components/ui/spinner";
import { useAdmin } from "./admin-context";

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

  const load = () => {
    setLoading(true);
    const q = villageId ? `?villageId=${villageId}` : "";
    fetch(`/api/admin/laporan${q}`)
      .then((r) => r.json())
      .then((d) => setLaporan(d.laporan || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [villageId]);

  async function updateStatus(id: string, status: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch("/api/admin/laporan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
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
