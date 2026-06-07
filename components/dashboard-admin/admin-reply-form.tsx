"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
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
  Loader2,
  MessageSquare,
  MapPin,
  Paperclip,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Reply,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ReplyMap = dynamic(() => import("@/components/auth/register-map"), {
  ssr: false,
  loading: () => <div className="h-[200px] rounded-lg bg-muted animate-pulse" />,
});

interface DocEntry {
  file?: File;
  url: string;
  deskripsi: string;
  preview?: string;
  uploading?: boolean;
}

interface ExtraForm {
  kategori: string;
  subKategori?: string;
  deskripsi: string;
  urgensi?: string;
}

interface Tanggapan {
  isi: string;
  petugas: string;
  createdAt: string;
  lokasi?: { lat: string; lng: string; address?: string };
  documents?: { url: string; deskripsi?: string }[];
  extraReplies?: { index: number; isi: string }[];
}

interface Props {
  laporanId: string;
  petugas: string;
  petugasOptions: string[];
  onPetugasChange: (v: string) => void;
  existingTanggapan: Tanggapan | null;
  extraForms: ExtraForm[];
  onSaved: () => void;
}

export function AdminReplyForm({
  laporanId,
  petugas,
  petugasOptions,
  onPetugasChange,
  existingTanggapan,
  extraForms,
  onSaved,
}: Props) {
  const [teks, setTeks] = useState("");
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPos, setMapPos] = useState<[number, number]>([-6.2, 106.8]);
  const [mapAddress, setMapAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [extraReplies, setExtraReplies] = useState<string[]>(extraForms.map(() => ""));
  const [expandedExtra, setExpandedExtra] = useState<boolean[]>(extraForms.map(() => false));
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadDoc(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", "admin-replies");
    const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url as string;
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    arr.forEach((file) => {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const idx = docs.length + arr.indexOf(file);
      const entry: DocEntry = { file, url: "", deskripsi: "", preview, uploading: true };
      setDocs((prev) => [...prev, entry]);
      uploadDoc(file)
        .then((url) => setDocs((prev) => prev.map((d, i) => i === idx ? { ...d, url, uploading: false } : d)))
        .catch((err) => {
          toast.error(err.message || "Gagal unggah");
          setDocs((prev) => prev.map((d, i) => i === idx ? { ...d, uploading: false } : d));
        });
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [docs]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!teks.trim()) return;
    if (docs.some((d) => d.uploading)) {
      toast.error("Tunggu dokumen selesai diunggah");
      return;
    }
    setSaving(true);
    try {
      const tanggapan: Partial<Tanggapan> = {
        isi: teks.trim(),
        petugas,
        lokasi: showMap ? { lat: String(mapPos[0]), lng: String(mapPos[1]), address: mapAddress || undefined } : undefined,
        documents: docs.filter((d) => d.url).map((d) => ({ url: d.url, deskripsi: d.deskripsi || undefined })),
        extraReplies: extraForms.map((_, i) => ({ index: i, isi: extraReplies[i] })).filter((r) => r.isi.trim()),
      };
      const res = await fetch("/api/admin/laporan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: laporanId, tanggapan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Tanggapan terkirim");
      setTeks("");
      setDocs([]);
      setShowMap(false);
      setExtraReplies(extraForms.map(() => ""));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tanggapan sebelumnya */}
      {existingTanggapan && (
        <div className="p-4 border border-foreground/10 rounded-xl bg-foreground/[0.02] space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{existingTanggapan.petugas}</span>
            <span className="text-xs font-mono text-muted-foreground">
              {new Date(existingTanggapan.createdAt).toLocaleString("id-ID")}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{existingTanggapan.isi}</p>
          {existingTanggapan.lokasi && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${existingTanggapan.lokasi.lat},${existingTanggapan.lokasi.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <MapPin className="w-3 h-3" />
              {existingTanggapan.lokasi.address || `${existingTanggapan.lokasi.lat}, ${existingTanggapan.lokasi.lng}`}
            </a>
          )}
          {existingTanggapan.documents && existingTanggapan.documents.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {existingTanggapan.documents.map((doc, i) => {
                const isImg = /\.(jpg|jpeg|png|webp)$/i.test(doc.url);
                return (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="border rounded-lg overflow-hidden hover:border-foreground/30 transition-colors">
                    {isImg
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={doc.url} alt={doc.deskripsi || `dok ${i+1}`} className="w-24 h-16 object-cover" />
                      : <div className="px-3 py-2 text-xs flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" />{doc.deskripsi || `Dok ${i+1}`}</div>
                    }
                  </a>
                );
              })}
            </div>
          )}
          {existingTanggapan.extraReplies && existingTanggapan.extraReplies.length > 0 && (
            <div className="space-y-2 pt-2">
              {existingTanggapan.extraReplies.map((r, i) => (
                <div key={i} className="border-l-2 border-foreground/20 pl-3">
                  <p className="text-[10px] text-muted-foreground">Permasalahan #{r.index + 1}</p>
                  <p className="text-sm">{r.isi}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FORM REPLY ── */}
      <form onSubmit={handleSend} className="space-y-3">

        {/* Header penanda area reply */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg border border-dashed border-foreground/15">
          <Reply className="w-3.5 h-3.5 shrink-0" />
          <span>{existingTanggapan ? "Tulis balasan baru — akan menggantikan tanggapan sebelumnya" : "Tulis tanggapan resmi desa untuk laporan ini"}</span>
        </div>

        <Textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder="Tulis tanggapan di sini..."
          rows={3}
          className="border-foreground/10 resize-none"
          required
        />

        {/* Per-permasalahan reply */}
        {extraForms.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Reply className="w-3 h-3" /> Balasan per permasalahan tambahan ({extraForms.length})
            </p>
            {extraForms.map((ef, i) => (
              <div key={i} className="border border-foreground/10 rounded-lg overflow-hidden">
                <button type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedExtra((prev) => prev.map((v, idx) => idx === i ? !v : v))}>
                  <span className="font-medium truncate">#{i + 1} — {ef.kategori}{ef.subKategori ? ` · ${ef.subKategori}` : ""}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2 shrink-0">
                    {extraReplies[i] && <span className="text-green-600 font-bold">✓</span>}
                    {expandedExtra[i] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {expandedExtra[i] && (
                  <div className="px-3 pb-3 border-t border-foreground/10 space-y-2">
                    <p className="text-xs text-muted-foreground pt-2 line-clamp-2 italic">&ldquo;{ef.deskripsi}&rdquo;</p>
                    <Textarea
                      value={extraReplies[i]}
                      onChange={(e) => setExtraReplies((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                      placeholder={`Jawaban untuk permasalahan #${i + 1}...`}
                      rows={2}
                      className="border-foreground/10 resize-none text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        {showMap && (
          <div className="border border-foreground/10 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
              <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Lokasi tindak lanjut
              </p>
              <button type="button" onClick={() => setShowMap(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <ReplyMap mapPosition={mapPos} setMapPosition={setMapPos} villageName={mapAddress} />
              <input type="text" value={mapAddress} onChange={(e) => setMapAddress(e.target.value)}
                placeholder="Deskripsi lokasi (opsional)"
                className="w-full text-sm border border-foreground/10 rounded-md px-3 py-1.5 bg-background" />
            </div>
          </div>
        )}

        {/* Dokumen — drag & drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => docs.length === 0 && fileInputRef.current?.click()}
          className={cn(
            "rounded-xl border-2 border-dashed transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-foreground/15",
            docs.length === 0 ? "cursor-pointer hover:border-foreground/30 hover:bg-muted/20 p-6" : "p-3"
          )}
        >
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
              <ImagePlus className="w-8 h-8 opacity-40" />
              <p className="text-sm font-medium">Seret & lepas dokumen ke sini</p>
              <p className="text-xs">atau klik untuk pilih file — Gambar / PDF, maks 50MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Grid preview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {docs.map((doc, i) => (
                  <div key={i} className="relative border border-foreground/10 rounded-lg overflow-hidden group bg-muted/20">
                    {doc.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={doc.preview} alt="preview" className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center">
                        <Paperclip className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    {doc.uploading && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                    {doc.url && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => setDocs((prev) => prev.filter((_, idx) => idx !== i))}
                          className="bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="px-2 pb-1.5 pt-1">
                      <input
                        type="text"
                        value={doc.deskripsi}
                        onChange={(e) => setDocs((prev) => prev.map((d, idx) => idx === i ? { ...d, deskripsi: e.target.value } : d))}
                        placeholder="Keterangan..."
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-[11px] bg-transparent border-0 border-b border-foreground/10 focus:outline-none focus:border-foreground/30 pb-0.5"
                      />
                    </div>
                  </div>
                ))}

                {/* Tambah lebih */}
                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="h-24 border-2 border-dashed border-foreground/15 rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-foreground/30 hover:bg-muted/20 transition-colors">
                  <Paperclip className="w-5 h-5 opacity-50" />
                  <span className="text-[10px]">Tambah</span>
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Seret file lagi untuk menambah · Hover gambar untuk hapus
              </p>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" multiple
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

        {/* Toolbar + submit */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button type="button" onClick={() => setShowMap((v) => !v)}
            className={cn("h-9 px-3 rounded-lg border text-xs flex items-center gap-1.5 transition-colors",
              showMap ? "border-primary text-primary bg-primary/5" : "border-foreground/10 text-muted-foreground hover:text-foreground"
            )}>
            <MapPin className="w-3.5 h-3.5" /> {showMap ? "Hapus lokasi" : "Tambah lokasi"}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <Select value={petugas} onValueChange={onPetugasChange}>
              <SelectTrigger className="border-foreground/10 h-9 w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {petugasOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={saving || !teks.trim()} size="sm" className="gap-1.5 h-9">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
              Kirim
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
