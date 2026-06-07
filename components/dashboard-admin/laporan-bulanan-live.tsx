"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "./admin-layout";
import { ExportLaporanPanel } from "./export-laporan-panel";
import { SectionHeading } from "./section-heading";
import { getAuthClient } from "@/lib/firebase/client";
import type { StatistikBulanan } from "./types";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type PreviewRow = {
  id: string;
  ticketId: string;
  kategori: string;
  status: string;
  tingkatUrgensi: string;
  wilayah: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Belum",
  dibaca: "Dibaca",
  diproses: "Proses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export function LaporanBulananLive() {
  const searchParams = useSearchParams();
  const villageId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState<StatistikBulanan[]>([]);
  const [totalLaporan, setTotalLaporan] = useState(0);
  const [selesai, setSelesai] = useState(0);
  const [rataRataJam, setRataRataJam] = useState(0);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [villageName, setVillageName] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const idToken = await getAuthClient().currentUser?.getIdToken();
        if (!idToken) return;
        const q = villageId ? `?villageId=${villageId}` : "";
        const res = await fetch(`/api/admin/statistik/bulanan${q}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStatistik(data.trend || []);
        setTotalLaporan(data.totalLaporan || 0);
        setSelesai(data.selesai || 0);
        setRataRataJam(data.rataRataJam || 0);
        setPreview(data.preview || []);
        setVillageName(data.villageName || "");
      } catch {
        // keep zeros
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [villageId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-16">
          <Spinner size="lg" text="Memuat laporan bulanan desa..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeading
          label="Statistik"
          title="Laporan bulanan & ekspor"
          description={`Rekap kinerja penanganan pengaduan Desa ${villageName || "Anda"} — data langsung dari Firebase.`}
        />
        <ExportLaporanPanel
          statistik={statistik}
          totalLaporan={totalLaporan}
          selesai={selesai}
          rataRataJam={rataRataJam}
          villageId={villageId || undefined}
        />

        {preview.length > 0 && (
          <div className="border border-foreground/10 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-mono text-muted-foreground">Preview data laporan</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-mono text-muted-foreground">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Wilayah</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Urgensi</th>
                    <th className="px-4 py-3">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.id} className="border-b border-foreground/5">
                      <td className="px-4 py-3 font-mono text-xs">{row.ticketId}</td>
                      <td className="px-4 py-3">{row.kategori}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.wilayah}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{STATUS_LABEL[row.status] || row.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{row.tingkatUrgensi}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString("id-ID") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
