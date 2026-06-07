"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PrioritasBadge, StatusBadge } from "./status-badge";
import { useAdmin } from "./admin-context";
import type { Laporan, StatusLaporan } from "./types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LaporanDetailProps {
  laporan: Laporan;
}

export function LaporanDetail({ laporan }: LaporanDetailProps) {
  const { profile, adminHref } = useAdmin();
  const [status, setStatus] = useState<StatusLaporan>(laporan.status);
  const [tanggapan, setTanggapan] = useState(laporan.tanggapan?.isi ?? "");
  const [petugas, setPetugas] = useState(laporan.petugas ?? profile?.name ?? "Kepala Desa");

  function handleSimpan() {
    toast.success("Tanggapan berhasil disimpan", {
      description: `Status laporan ${laporan.nomor} diperbarui menjadi "${status}".`,
    });
  }

  function handleCetak() {
    toast.info("Mengekspor PDF...", {
      description: "Fitur cetak akan terhubung ke backend Laravel.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="font-mono text-xs">
          <Link href={adminHref("/admin/laporan")}>
            <ArrowLeft className="size-3.5" />
            Kembali
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-muted-foreground">{laporan.nomor}</p>
          <h2 className="font-display text-2xl lg:text-3xl tracking-tight">{laporan.judul}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <PrioritasBadge prioritas={laporan.prioritas} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-foreground/10 rounded-lg p-6 bg-foreground/[0.01]">
            <p className="text-xs font-mono text-muted-foreground mb-3">Deskripsi laporan</p>
            <p className="leading-relaxed text-foreground/90">{laporan.deskripsi}</p>
            {laporan.lokasi && (
              <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                {laporan.lokasi}
              </div>
            )}
          </div>

          <div className="border border-foreground/10 rounded-lg p-6">
            <p className="text-xs font-mono text-muted-foreground mb-4">Tanggapan & tindak lanjut</p>

            {laporan.tanggapan && (
              <div className="mb-6 p-4 border border-foreground/10 rounded-lg bg-foreground/[0.02]">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-medium">{laporan.tanggapan.petugas}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatDate(laporan.tanggapan.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{laporan.tanggapan.isi}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Ubah status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as StatusLaporan)}>
                    <SelectTrigger id="status" className="border-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Belum di Proses">Belum di Proses</SelectItem>
                      <SelectItem value="Sedang di Proses">Sedang di Proses</SelectItem>
                      <SelectItem value="Selesai">Selesai</SelectItem>
                      <SelectItem value="Ditolak">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="petugas">Petugas penanggung jawab</Label>
                  <Select value={petugas} onValueChange={setPetugas}>
                    <SelectTrigger id="petugas" className="border-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kepala Desa">Kepala Desa</SelectItem>
                      <SelectItem value="Sekdes — Pak Joko">Sekdes — Pak Joko</SelectItem>
                      <SelectItem value="Kasi Pemerintahan">Kasi Pemerintahan</SelectItem>
                      <SelectItem value="Kasi Pembangunan">Kasi Pembangunan</SelectItem>
                      <SelectItem value="Kasi Kesejahteraan">Kasi Kesejahteraan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggapan">Tanggapan untuk warga</Label>
                <Textarea
                  id="tanggapan"
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  placeholder="Tuliskan tindak lanjut, jadwal penanganan, atau hasil penyelesaian..."
                  rows={4}
                  className="border-foreground/10 resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSimpan}>Simpan tanggapan</Button>
                <Button variant="outline" onClick={handleCetak} className="border-foreground/10">
                  <Download className="size-4" />
                  Cetak PDF
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-foreground/10 rounded-lg p-5">
            <p className="text-xs font-mono text-muted-foreground mb-4">Data pelapor</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{laporan.pelapor.nama}</p>
                  <p className="text-xs font-mono text-muted-foreground">NIK {laporan.pelapor.nik}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-muted-foreground" />
                <p className="text-sm">{laporan.pelapor.telepon}</p>
              </div>
            </div>
          </div>

          <div className="border border-foreground/10 rounded-lg p-5">
            <p className="text-xs font-mono text-muted-foreground mb-4">Informasi laporan</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Kategori</dt>
                <dd className="text-right">
                  {laporan.kategori}
                  {laporan.subKategori && laporan.kategori?.startsWith("Lainnya") && (
                    <span className="block text-xs text-muted-foreground">{laporan.subKategori}</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Dusun</dt>
                <dd className="text-right">{laporan.dusun}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">RT/RW</dt>
                <dd className="text-right font-mono">RT {laporan.rt}/RW {laporan.rw}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Dilaporkan</dt>
                <dd className="text-right text-xs font-mono">{formatDate(laporan.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Diperbarui</dt>
                <dd className="text-right text-xs font-mono">{formatDate(laporan.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {laporan.foto && (
            <div className="border border-foreground/10 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={laporan.foto} alt="Bukti laporan" className="w-full aspect-video object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
