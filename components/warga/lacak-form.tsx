"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, CheckCircle2, Clock, Eye, ShieldX, MessageSquare, MapPin, Paperclip, Link2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Tanggapan = {
  isi: string;
  petugas: string;
  createdAt: string;
  lokasi?: { lat: string; lng: string; address?: string };
  documents?: { url: string; deskripsi?: string }[];
  extraReplies?: { index: number; isi: string }[];
};

type TrackResult = {
  ticketId: string;
  status: string;
  statusLabel: string;
  adminRead: boolean;
  adminReadAt: string | null;
  villageName: string;
  kategori: string;
  tingkatUrgensi: string;
  blockchainHash: string;
  blockchainVerified: boolean;
  timeline: { status: string; statusLabel?: string; note: string; at: string }[];
  tanggapan: Tanggapan | null;
  createdAt: string;
};

// Urutan status progres
const STATUS_STEPS = ["submitted", "diproses", "selesai"] as const;
const STATUS_LABELS: Record<string, string> = {
  submitted: "Diterima",
  dibaca: "Diterima",   // map ke step pertama
  diproses: "Sedang Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusProgress({ status }: { status: string }) {
  if (status === "ditolak") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
        <ShieldX className="w-5 h-5 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">Laporan Ditolak</p>
          <p className="text-xs text-muted-foreground">Laporan tidak memenuhi syarat atau sudah ditangani pihak lain.</p>
        </div>
      </div>
    );
  }

  const normalizedStatus = status === "dibaca" ? "submitted" : status;
  const currentIdx = STATUS_STEPS.indexOf(normalizedStatus as typeof STATUS_STEPS[number]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((s, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                done ? "bg-foreground border-foreground text-background" : "border-foreground/20 text-muted-foreground"
              )}>
                {done && i < currentIdx
                  ? <CheckCircle2 className="w-4 h-4" />
                  : active
                  ? <span className="w-2.5 h-2.5 rounded-full bg-background animate-pulse" />
                  : <span className="w-2 h-2 rounded-full bg-foreground/20" />
                }
              </div>
              <span className={cn("text-[10px] font-medium text-center leading-tight",
                active ? "text-foreground" : done ? "text-foreground/60" : "text-muted-foreground"
              )}>
                {STATUS_LABELS[s]}
              </span>
              {/* Connector line */}
              {i < STATUS_STEPS.length - 1 && (
                <div className={cn(
                  "absolute h-0.5 top-4",
                  // positioned via parent
                )} />
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-700"
          style={{ width: `${Math.max(5, ((currentIdx) / (STATUS_STEPS.length - 1)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TanggapanCard({ t }: { t: Tanggapan }) {
  return (
    <div className="ml-9 mt-2 border border-foreground/15 rounded-xl p-4 space-y-3 bg-foreground/[0.02]">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold">{t.petugas}</span>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{fmt(t.createdAt)}</span>
      </div>

      <p className="text-sm leading-relaxed">{t.isi}</p>

      {t.lokasi && (
        <a href={`https://www.google.com/maps/search/?api=1&query=${t.lokasi.lat},${t.lokasi.lng}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs border border-foreground/15 rounded-lg px-3 py-1.5 hover:bg-muted/30 transition-colors">
          <MapPin className="w-3.5 h-3.5" />
          {t.lokasi.address || `${parseFloat(t.lokasi.lat).toFixed(5)}, ${parseFloat(t.lokasi.lng).toFixed(5)}`}
        </a>
      )}

      {t.documents && t.documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {t.documents.map((doc, i) => {
            const isImg = /\.(jpg|jpeg|png|webp)$/i.test(doc.url);
            return (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                className="border border-foreground/15 rounded-lg overflow-hidden hover:border-foreground/30 transition-colors">
                {isImg
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={doc.url} alt={doc.deskripsi || `dok ${i+1}`} className="w-20 h-14 object-cover" />
                  : <div className="px-3 py-2 text-xs flex items-center gap-1.5 text-muted-foreground">
                      <Paperclip className="w-3.5 h-3.5" />{doc.deskripsi || `Dokumen ${i+1}`}
                    </div>
                }
              </a>
            );
          })}
        </div>
      )}

      {t.extraReplies && t.extraReplies.length > 0 && (
        <div className="space-y-2 border-t border-foreground/10 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balasan per permasalahan</p>
          {t.extraReplies.map((r, i) => (
            <div key={i} className="border-l-2 border-foreground/20 pl-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Permasalahan #{r.index + 1}</p>
              <p className="text-sm">{r.isi}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LacakForm() {
  const searchParams = useSearchParams();
  const [ticketId, setTicketId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);

  const handleTrack = useCallback(async (manualTicket?: string, manualPin?: string) => {
    const tId = manualTicket || ticketId;
    const p = manualPin || pin;
    if (!tId || !p) return;
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/laporan/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: tId, pin: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal melacak");
    } finally {
      setLoading(false);
    }
  }, [ticketId, pin]);

  useEffect(() => {
    const t = searchParams.get("ticketId");
    const p = searchParams.get("pin");
    if (t && p) {
      setTicketId(t);
      setPin(p);
      handleTrack(t, p);
    }
  }, [searchParams, handleTrack]);

  // Cari di mana tanggapan masuk di timeline (setelah event terakhir atau inline)
  const tanggapanAt = result?.tanggapan?.createdAt;
  const tanggapanInsertAfter = tanggapanAt && result?.timeline
    ? result.timeline.reduce((best, t, i) => new Date(t.at) <= new Date(tanggapanAt) ? i : best, -1)
    : -1;

  return (
    <div className="space-y-8">
      {/* Form input */}
      <form onSubmit={(e) => { e.preventDefault(); handleTrack(); }} className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="ticket">Nomor Tiket WBS</Label>
          <Input id="ticket" placeholder="WBS-2026-XXXXXX" value={ticketId}
            onChange={(e) => setTicketId(e.target.value.toUpperCase())} className="font-mono" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pin">PIN Pelacakan</Label>
          <Input id="pin" placeholder="PIN 8 karakter" value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase())} className="font-mono" required />
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
        <Button type="submit" className="w-full rounded-full gap-2" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Lacak Status
        </Button>
      </form>

      {result && (
        <div className="space-y-6">
          {/* Header tiket */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{result.ticketId}</p>
              <p className="text-sm font-semibold mt-0.5">{result.kategori} · {result.villageName}</p>
              <p className="text-xs text-muted-foreground">Dilaporkan {fmt(result.createdAt)}</p>
            </div>
            <button onClick={() => handleTrack()} title="Refresh"
              className="p-2 rounded-lg border border-foreground/10 hover:bg-muted/30 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Progress status */}
          <div className="border border-foreground/10 rounded-xl p-5">
            <StatusProgress status={result.status} />
          </div>

          {/* Timeline + tanggapan inline */}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-widest">Riwayat & Tanggapan</p>
            <div className="relative pl-4 border-l-2 border-foreground/10 space-y-0 ml-3">
              {result.timeline.map((t, i) => {
                const isLast = i === result.timeline.length - 1;
                return (
                  <div key={i} className={cn("relative", isLast ? "pb-0" : "pb-6")}>
                    {/* Dot */}
                    <span className={cn(
                      "absolute -left-[1.45rem] top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-background",
                      isLast ? "border-foreground" : "border-foreground/30"
                    )}>
                      {t.status === "selesai" ? <CheckCircle2 className="w-3 h-3" />
                        : t.status === "dibaca" ? <Eye className="w-3 h-3" />
                        : t.status === "ditolak" ? <ShieldX className="w-3 h-3" />
                        : isLast ? <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                      }
                    </span>

                    <div className="pl-3">
                      <p className={cn("text-sm font-semibold", isLast ? "text-foreground" : "text-foreground/70")}>
                        {t.statusLabel || STATUS_LABELS[t.status] || t.status}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.note}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{fmt(t.at)}</p>
                    </div>

                    {/* Sisipkan tanggapan admin setelah event yang tepat */}
                    {result.tanggapan && i === tanggapanInsertAfter && (
                      <TanggapanCard t={result.tanggapan} />
                    )}
                  </div>
                );
              })}

              {/* Kalau tanggapan lebih baru dari semua timeline event */}
              {result.tanggapan && tanggapanInsertAfter === result.timeline.length - 1 && tanggapanAt &&
                result.timeline.length > 0 &&
                new Date(tanggapanAt) > new Date(result.timeline[result.timeline.length - 1].at) && (
                <div className="pb-0 pt-6 relative">
                  <span className="absolute -left-[1.45rem] top-6.5 w-5 h-5 rounded-full border-2 border-foreground bg-background flex items-center justify-center">
                    <MessageSquare className="w-3 h-3" />
                  </span>
                  <div className="pl-3">
                    <p className="text-sm font-semibold">Tanggapan Desa</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{fmt(tanggapanAt)}</p>
                  </div>
                  <TanggapanCard t={result.tanggapan} />
                </div>
              )}
            </div>
          </div>

          {/* Blockchain — lipat ke bawah, tidak ditonjolkan */}
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Link2 className="w-3.5 h-3.5" />
              Verifikasi integritas blockchain
              <span className="ml-auto group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="mt-2 p-3 rounded-lg border border-foreground/10 bg-muted/20">
              <p className="text-[10px] font-mono break-all text-muted-foreground">{result.blockchainHash}</p>
              {result.blockchainVerified && (
                <p className="text-[10px] text-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Integritas data terverifikasi
                </p>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
