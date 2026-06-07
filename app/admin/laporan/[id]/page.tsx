"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AdminReplyForm } from "@/components/dashboard-admin/admin-reply-form";
const MapDetailLazy = dynamic(() => import("@/components/dashboard-admin/laporan-detail-map"), { ssr: false });
import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { useAdmin } from "@/components/dashboard-admin/admin-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";

type Timeline = { status: string; note: string; at: string };
type Document = { url: string; deskripsi?: string };
type ExtraForm = { kategori: string; subKategori?: string; deskripsi: string; urgensi?: string };
type Tanggapan = { isi: string; petugas: string; createdAt: string };

type LaporanDetail = {
  id: string;
  ticketId: string;
  villageName: string;
  villageLat: string;
  villageLng: string;
  issueLat: string;
  issueLng: string;
  issueAddress: string;
  kategori: string;
  kategoriAsli: string;
  subKategori: string;
  deskripsi: string;
  tingkatUrgensi: string;
  status: string;
  adminRead: boolean;
  tanggalKejadian: string;
  jamKejadian: string;
  rt: string;
  rw: string;
  documents: Document[];
  extraForms: ExtraForm[];
  blockchainHash: string;
  timeline: Timeline[];
  tanggapan: Tanggapan | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_MAP: Record<string, string> = {
  submitted: "Belum di Proses",
  dibaca: "Dibaca Admin",
  diproses: "Sedang di Proses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  submitted: <Clock className="w-3.5 h-3.5" />,
  dibaca: <CheckCircle2 className="w-3.5 h-3.5" />,
  diproses: <Spinner size="sm" />,
  selesai: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  ditolak: <AlertTriangle className="w-3.5 h-3.5 text-destructive" />,
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminLaporanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, adminHref } = useAdmin();

  const [laporan, setLaporan] = useState<LaporanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [petugas, setPetugas] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/laporan?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const l: LaporanDetail = data.laporan;
      setLaporan(l);
      setStatus(l.status);
      setPetugas(l.tanggapan?.petugas || profile?.name || "Kepala Desa");

      // Auto mark dibaca
      if (!l.adminRead) {
        await fetch("/api/admin/laporan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: l.status }),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Spinner size="lg" text="Memuat detail laporan..." />
        </div>
      </AdminLayout>
    );
  }

  if (!laporan) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-muted-foreground">Laporan tidak ditemukan</div>
      </AdminLayout>
    );
  }

  const issueLatNum = parseFloat(laporan.issueLat);
  const issueLngNum = parseFloat(laporan.issueLng);
  const hasIssueCoords = !isNaN(issueLatNum) && !isNaN(issueLngNum);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-4">
          <Button variant="ghost" size="sm" asChild className="font-mono text-xs">
            <Link href={adminHref("/admin/laporan")}>
              <ArrowLeft className="size-3.5 mr-1" /> Kembali
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground">{laporan.ticketId}</p>
            <h2 className="font-display text-2xl lg:text-3xl tracking-tight mt-0.5">
              {laporan.kategoriAsli === "Lainnya" && laporan.subKategori
                ? laporan.subKategori
                : laporan.kategori}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{laporan.villageName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={laporan.tingkatUrgensi === "Darurat" ? "destructive" : "secondary"}>
              {laporan.tingkatUrgensi}
            </Badge>
            <Badge variant="outline">{STATUS_MAP[laporan.status] || laporan.status}</Badge>
            {laporan.adminRead && (
              <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">✓ Dibaca</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Kolom kiri */}
          <div className="lg:col-span-2 space-y-6">

            {/* Deskripsi */}
            <div className="border border-foreground/10 rounded-xl p-6 space-y-3">
              <p className="text-xs font-mono text-muted-foreground">Deskripsi laporan</p>
              <p className="leading-relaxed">{laporan.deskripsi}</p>
              {laporan.issueAddress && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0 mt-0.5" />
                  {laporan.issueAddress}
                </div>
              )}
              {laporan.tanggalKejadian && (
                <p className="text-xs text-muted-foreground font-mono">
                  Kejadian: {laporan.tanggalKejadian}{laporan.jamKejadian ? ` pukul ${laporan.jamKejadian}` : ""}
                </p>
              )}
            </div>

            {/* Maps lokasi kejadian */}
            {hasIssueCoords && (
              <div className="border border-foreground/10 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                  <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Lokasi kejadian
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${issueLatNum},${issueLngNum}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <MapDetailLazy lat={issueLatNum} lng={issueLngNum} label={laporan.issueAddress || laporan.kategori} />
              </div>
            )}

            {/* Permasalahan tambahan (extraForms) */}
            {laporan.extraForms.length > 0 && (
              <div className="border border-foreground/10 rounded-xl p-6 space-y-4">
                <p className="text-xs font-mono text-muted-foreground">Permasalahan tambahan ({laporan.extraForms.length})</p>
                {laporan.extraForms.map((ef, i) => (
                  <div key={i} className="border border-foreground/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{ef.kategori}</span>
                      {ef.subKategori && <span className="text-xs text-muted-foreground">· {ef.subKategori}</span>}
                      {ef.urgensi && (
                        <Badge variant={ef.urgensi === "Darurat" ? "destructive" : "secondary"} className="text-[10px]">
                          {ef.urgensi}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{ef.deskripsi}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Dokumen */}
            {laporan.documents.length > 0 && (
              <div className="border border-foreground/10 rounded-xl p-6 space-y-4">
                <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Dokumen pendukung ({laporan.documents.length})
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {laporan.documents.map((doc, i) => {
                    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.url);
                    const isPdf = /\.pdf$/i.test(doc.url);
                    return (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-foreground/10 rounded-lg overflow-hidden hover:border-foreground/30 transition-colors block"
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={doc.url} alt={doc.deskripsi || `Dokumen ${i + 1}`} className="w-full aspect-video object-cover" />
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3">
                            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{isPdf ? "PDF" : "Dokumen"} {i + 1}</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-auto text-muted-foreground shrink-0" />
                          </div>
                        )}
                        {doc.deskripsi && (
                          <p className="px-3 py-2 text-xs text-muted-foreground border-t border-foreground/10">{doc.deskripsi}</p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tanggapan admin */}
            <div className="border border-foreground/10 rounded-xl p-6 space-y-4">
              <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Tanggapan resmi desa
              </p>
              <AdminReplyForm
                laporanId={laporan.id}
                petugas={petugas}
                petugasOptions={[
                  profile?.name || "Kepala Desa",
                  "Sekdes",
                  "Kasi Pemerintahan",
                  "Kasi Pembangunan",
                  "Kasi Kesejahteraan",
                ]}
                onPetugasChange={setPetugas}
                existingTanggapan={laporan.tanggapan}
                extraForms={laporan.extraForms}
                onSaved={load}
              />
            </div>

            {/* Update status */}
            <div className="border border-foreground/10 rounded-xl p-5 space-y-3">
              <p className="text-xs font-mono text-muted-foreground">Update status</p>
              <div className="flex items-center gap-3">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="border-foreground/10 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["submitted", "dibaca", "diproses", "selesai", "ditolak"].map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_MAP[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" disabled={saving || status === laporan.status} onClick={async () => {
                  setSaving(true);
                  await fetch("/api/admin/laporan", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: laporan.id, status }),
                  });
                  await load();
                  setSaving(false);
                }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                </Button>
              </div>
            </div>
          </div>

          {/* Kolom kanan */}
          <div className="space-y-6">

            {/* Info laporan */}
            <div className="border border-foreground/10 rounded-xl p-5 space-y-3">
              <p className="text-xs font-mono text-muted-foreground">Informasi laporan</p>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Kategori</dt>
                  <dd className="text-right font-medium">{laporan.kategori}</dd>
                </div>
                {laporan.rt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">RT/RW</dt>
                    <dd className="font-mono">RT {laporan.rt}/RW {laporan.rw}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Dilaporkan</dt>
                  <dd className="text-right text-xs font-mono">{formatDate(laporan.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Diperbarui</dt>
                  <dd className="text-right text-xs font-mono">{formatDate(laporan.updatedAt)}</dd>
                </div>
              </dl>
              <div className="pt-2 border-t border-foreground/10">
                <p className="text-[10px] font-mono text-muted-foreground truncate">⛓ {laporan.blockchainHash?.slice(0, 32)}…</p>
              </div>
            </div>

            {/* Timeline */}
            {laporan.timeline.length > 0 && (
              <div className="border border-foreground/10 rounded-xl p-5 space-y-3">
                <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timeline
                </p>
                <div className="space-y-3">
                  {[...laporan.timeline].reverse().map((t, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="mt-0.5 text-muted-foreground shrink-0">
                        {STATUS_ICON[t.status] || <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{t.note}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatDate(t.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
