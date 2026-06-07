"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LaporanTrendChart } from "./laporan-trend-chart";
import { getAuthClient } from "@/lib/firebase/client";
import type { StatistikBulanan } from "./types";

interface ExportLaporanPanelProps {
  statistik: StatistikBulanan[];
  totalLaporan: number;
  selesai: number;
  rataRataJam?: number;
  villageId?: string;
}

export function ExportLaporanPanel({
  statistik,
  totalLaporan,
  selesai,
  rataRataJam = 0,
  villageId,
}: ExportLaporanPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const persentase = totalLaporan > 0 ? Math.round((selesai / totalLaporan) * 100) : 0;

  async function handleExport(format: "pdf" | "excel" | "rekap") {
    setExporting(format);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis, login ulang");

      const fmt = format === "excel" ? "csv" : format === "rekap" ? "csv" : "pdf";
      const q = new URLSearchParams({ format: fmt });
      if (villageId) q.set("villageId", villageId);

      const res = await fetch(`/api/admin/export?${q.toString()}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengekspor");
      }

      if (format === "pdf") {
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
        } else {
          toast.error("Izinkan pop-up untuk mencetak PDF");
        }
        toast.success("Buka tab baru untuk cetak / simpan PDF");
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === "rekap" ? "rekap-bulanan.csv" : "laporan-desa.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(format === "rekap" ? "Rekap bulanan diunduh" : "Excel/CSV diunduh");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengekspor");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01]">
          <p className="text-xs font-mono text-muted-foreground mb-2">Total laporan</p>
          <p className="font-display text-4xl">{totalLaporan}</p>
        </div>
        <div className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01]">
          <p className="text-xs font-mono text-muted-foreground mb-2">Tingkat penyelesaian</p>
          <p className="font-display text-4xl">{persentase}%</p>
        </div>
        <div className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01]">
          <p className="text-xs font-mono text-muted-foreground mb-2">Rata-rata waktu</p>
          <p className="font-display text-4xl">
            {rataRataJam}
            <span className="text-2xl"> jam</span>
          </p>
        </div>
      </div>

      <LaporanTrendChart data={statistik} />

      <div className="border border-foreground/10 rounded-lg p-6">
        <p className="text-xs font-mono text-muted-foreground mb-4">Ekspor laporan (Firebase → unduh)</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-foreground/10"
            disabled={!!exporting}
            onClick={() => handleExport("pdf")}
          >
            {exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            Cetak PDF Semua
          </Button>
          <Button
            variant="outline"
            className="border-foreground/10"
            disabled={!!exporting}
            onClick={() => handleExport("excel")}
          >
            {exporting === "excel" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            Unduh Excel
          </Button>
          <Button
            variant="outline"
            className="border-foreground/10"
            disabled={!!exporting}
            onClick={() => handleExport("rekap")}
          >
            {exporting === "rekap" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Rekap Bulanan
          </Button>
        </div>
      </div>
    </div>
  );
}
