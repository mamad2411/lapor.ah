"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  FilePlus,
  Trash2,
  Loader2,
  CheckCircle2,
  Lock,
  Link2,
  Copy,
  Plus,
  Minus,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueMap } from "./issue-map";
import type { VillageOption } from "@/lib/warga/types";
import { toast } from "sonner";
import Link from "next/link";
import { saveToHistory } from "@/lib/warga/history";

const KATEGORI = [
  "Sampah & Pencemaran",
  "Saluran Air & Banjir",
  "Hutan & Lahan",
  "Udara & Asap",
  "Kebisingan",
  "Satwa Liar",
  "Infrastruktur Hijau",
  "Lainnya",
];

const DESKRIPSI_MAX = 3000;

interface DocEntry {
  url: string;       // kosong kalau manual (belum upload)
  deskripsi: string;
  uploading?: boolean;
}

export function LaporanForm() {
  const [mounted, setMounted] = useState(false);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [villageId, setVillageId] = useState("");
  const [issuePosition, setIssuePosition] = useState<[number, number]>([-6.1754, 106.8272]);
  const [issueAddress, setIssueAddress] = useState("");
  const [kategori, setKategori] = useState("");
  const [subKategori, setSubKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [urgensi, setUrgensi] = useState("Sedang");
  // Tanggal & jam kejadian (ganti dusun/RT/RW)
  const [tanggal, setTanggal] = useState("");
  const [jam, setJam] = useState("");
  const [rt, setRt] = useState("");
  const [rw, setRw] = useState("");

  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [extraForms, setExtraForms] = useState<
    { kategori: string; subKategori: string; deskripsi: string; urgensi: string }[]
  >([]);
  const [result, setResult] = useState<{
    ticketId: string;
    trackingPin: string;
    blockchainHash: string;
  } | null>(null);

  const selectedVillage = villages.find((v) => v.id === villageId);

  useEffect(() => {
    setMounted(true);
    fetch("/api/villages/list")
      .then((r) => r.json())
      .then((d) => setVillages(d.villages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedVillage) {
      setIssuePosition([
        parseFloat(selectedVillage.latitude),
        parseFloat(selectedVillage.longitude),
      ]);
    }
  }, [selectedVillage]);

  // Upload satu file dan update entry tertentu by index
  async function uploadFileForDoc(file: File, idx: number) {
    setDocs((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, uploading: true } : d))
    );
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", "laporan");
      const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((prev) =>
        prev.map((d, i) => (i === idx ? { ...d, url: data.url, uploading: false } : d))
      );
      toast.success("Dokumen diunggah");
    } catch (err) {
      setDocs((prev) =>
        prev.map((d, i) => (i === idx ? { ...d, uploading: false } : d))
      );
      toast.error(err instanceof Error ? err.message : "Gagal unggah");
    }
  }

  function addDoc() {
    setDocs((prev) => [...prev, { url: "", deskripsi: "" }]);
  }

  function removeDoc(i: number) {
    setDocs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateDocDeskripsi(i: number, value: string) {
    setDocs((prev) => prev.map((d, idx) => (idx === i ? { ...d, deskripsi: value } : d)));
  }

  function addForm() {
    setExtraForms((prev) => [
      ...prev,
      { kategori: "", subKategori: "", deskripsi: "", urgensi: "Sedang" },
    ]);
  }

  function removeForm(i: number) {
    setExtraForms((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateExtra(i: number, key: string, value: string) {
    setExtraForms((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, [key]: value } : f))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!villageId || !kategori || deskripsi.length < 20) {
      toast.error("Lengkapi desa tujuan, kategori, dan deskripsi (min. 20 karakter)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/laporan/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId,
          villageName: selectedVillage?.villageName,
          villageLat: selectedVillage?.latitude,
          villageLng: selectedVillage?.longitude,
          issueLat: issuePosition[0].toString(),
          issueLng: issuePosition[1].toString(),
          issueAddress,
          kategori,
          subKategori,
          deskripsi,
          tingkatUrgensi: urgensi,
          tanggalKejadian: tanggal,
          jamKejadian: jam,
          rt,
          rw,
          documents: docs
            .filter((d) => d.url)
            .map((d) => ({ url: d.url, deskripsi: d.deskripsi })),
          extraForms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      
      // Simpan ke riwayat lokal device
      saveToHistory({
        ticketId: data.ticketId,
        trackingPin: data.trackingPin,
        createdAt: Date.now(),
        villageName: selectedVillage?.villageName,
        kategori: kategori
      });

      toast.success("Laporan terkirim secara anonim");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal kirim");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return <div className="h-96 flex items-center justify-center border border-dashed rounded-2xl text-muted-foreground animate-pulse">Menyiapkan Formulir...</div>;
  }

  if (result) {
    return (
      <Card className="border-green-200 bg-green-50/30 w-full overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-green-700 text-lg sm:text-xl">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> Laporan Terkirim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Identitas Anda <strong>tidak dicatat</strong>. Simpan kredensial pelacakan di bawah —
            ini satu-satunya cara melacak laporan.
          </p>
          <div className="grid gap-3 p-4 rounded-xl border bg-background font-mono text-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Nomor Tiket</span>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                <strong className="truncate">{result.ticketId}</strong>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => { navigator.clipboard.writeText(result.ticketId); toast.success("Disalin"); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4 pt-2 border-t sm:border-t-0">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">PIN Pelacakan</span>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                <strong className="truncate">{result.trackingPin}</strong>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => { navigator.clipboard.writeText(result.trackingPin); toast.success("Disalin"); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="pt-3 border-t">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Blockchain Hash</span>
              <p className="text-[10px] break-all mt-1 bg-muted/30 p-2 rounded leading-relaxed">{result.blockchainHash}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full sm:flex-1 rounded-full h-11">
              <Link href="/laporan/lacak">Lacak Laporan</Link>
            </Button>
            <Button variant="outline" className="w-full sm:flex-1 rounded-full h-11" onClick={() => setResult(null)}>
              Buat Laporan Baru
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Lokasi ── */}
      <section className="space-y-4">
        <h2 className="font-display text-xl flex items-center gap-2">
          <MapPin className="w-5 h-5" /> Desa Tujuan & Lokasi
        </h2>
        <div className="space-y-2">
          <Label>Pilih Desa *</Label>
          <Select value={villageId} onValueChange={setVillageId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih desa tujuan laporan" />
            </SelectTrigger>
            <SelectContent>
              {villages.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.villageName} — {v.adminName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVillage && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Koordinat desa: {selectedVillage.latitude}, {selectedVillage.longitude}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Lokasi Kejadian (titik di peta) *</Label>
          <div className="h-[280px] rounded-xl border overflow-hidden">
            <IssueMap
              position={issuePosition}
              setPosition={setIssuePosition}
              villageName={selectedVillage?.villageName}
            />
          </div>
          <Input
            placeholder="Alamat / landmark lokasi kejadian"
            value={issueAddress}
            onChange={(e) => setIssueAddress(e.target.value)}
          />
        </div>

        {/* Tanggal & Jam kejadian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Tanggal Kejadian
            </Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Jam Kejadian
            </Label>
            <Input
              type="time"
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* RT / RW */}
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="RT" value={rt} onChange={(e) => setRt(e.target.value)} className="w-full" />
          <Input placeholder="RW" value={rw} onChange={(e) => setRw(e.target.value)} className="w-full" />
        </div>
      </section>

      {/* ── Detail utama ── */}
      <DetailForm
        index={0}
        kategori={kategori}
        setKategori={setKategori}
        subKategori={subKategori}
        setSubKategori={setSubKategori}
        deskripsi={deskripsi}
        setDeskripsi={setDeskripsi}
        urgensi={urgensi}
        setUrgensi={setUrgensi}
      />

      {/* ── Form tambahan ── */}
      {extraForms.map((f, i) => (
        <div key={i} className="border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Permasalahan #{i + 2}
            </span>
            <Button type="button" variant="ghost" size="icon"
              className="h-7 w-7 text-destructive" onClick={() => removeForm(i)}>
              <Minus className="w-4 h-4" />
            </Button>
          </div>
          <DetailForm
            index={i + 1}
            kategori={f.kategori}
            setKategori={(v) => updateExtra(i, "kategori", v)}
            subKategori={f.subKategori}
            setSubKategori={(v) => updateExtra(i, "subKategori", v)}
            deskripsi={f.deskripsi}
            setDeskripsi={(v) => updateExtra(i, "deskripsi", v)}
            urgensi={f.urgensi}
            setUrgensi={(v) => updateExtra(i, "urgensi", v)}
          />
        </div>
      ))}

      <Button type="button" variant="outline"
        className="w-full rounded-full border-dashed gap-2" onClick={addForm}>
        <Plus className="w-4 h-4" /> Tambah Permasalahan
      </Button>

      {/* ── Dokumen pendukung ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl flex items-center gap-2">
              <FilePlus className="w-5 h-5" /> Dokumen Pendukung
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5">
              Opsional
            </span>
          </div>
          <Button type="button" variant="outline" size="sm"
            className="rounded-full gap-1.5 h-8 text-xs" onClick={addDoc}>
            <Plus className="w-3.5 h-3.5" /> Tambah Dokumen
          </Button>
        </div>

        {docs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-xl">
            Belum ada dokumen. Klik &ldquo;Tambah Dokumen&rdquo; untuk menambahkan.
          </p>
        )}

        {docs.length > 0 && (
          <ul className="space-y-3">
            {docs.map((doc, i) => (
              <li key={i} className="rounded-xl border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dokumen #{i + 1}</span>
                  <Button type="button" variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive shrink-0" onClick={() => removeDoc(i)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Upload file */}
                <label className="flex items-center gap-3 border border-dashed rounded-lg px-3 py-2.5 cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFileForDoc(file, i);
                      e.target.value = "";
                    }}
                    disabled={doc.uploading}
                  />
                  {doc.uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <FilePlus className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm text-muted-foreground truncate">
                    {doc.url
                      ? doc.url.split("/").pop()
                      : "Klik untuk pilih file — foto, PDF, video"}
                  </span>
                </label>

                {/* Deskripsi */}
                <Input
                  placeholder="Deskripsi dokumen (opsional)"
                  value={doc.deskripsi}
                  onChange={(e) => updateDocDeskripsi(i, e.target.value)}
                  className="text-sm h-8"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        Data dilindungi enkripsi. Hash blockchain dicatat saat submit.
      </div>

      <Button type="submit" className="w-full h-12 rounded-full text-base" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Kirim Laporan Anonim
      </Button>
    </form>
  );
}

/* ─── Sub-komponen form detail ──────────────────────────────────── */
function DetailForm({
  index,
  kategori,
  setKategori,
  subKategori,
  setSubKategori,
  deskripsi,
  setDeskripsi,
  urgensi,
  setUrgensi,
}: {
  index: number;
  kategori: string;
  setKategori: (v: string) => void;
  subKategori: string;
  setSubKategori: (v: string) => void;
  deskripsi: string;
  setDeskripsi: (v: string) => void;
  urgensi: string;
  setUrgensi: (v: string) => void;
}) {
  const isLainnya = kategori === "Lainnya";

  return (
    <section className="space-y-4">
      {index === 0 && (
        <h2 className="font-display text-xl">Detail Permasalahan</h2>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kategori *</Label>
          <Select value={kategori} onValueChange={(v) => { setKategori(v); if (v !== "Lainnya") setSubKategori(""); }}>
            <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
            <SelectContent>
              {KATEGORI.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Sub-kategori</Label>
          <Input
            placeholder="Contoh: Tumpukan sampah illegal"
            value={subKategori}
            onChange={(e) => setSubKategori(e.target.value)}
          />
        </div>
      </div>

      {/* Field tambahan saat pilih "Lainnya" */}
      {isLainnya && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-medium text-primary">
            Jelaskan kategori permasalahan Anda
          </p>
          <div className="space-y-2">
            <Label>Nama Kategori *</Label>
            <Input
              placeholder="Contoh: Limbah Industri, Polusi Cahaya, Erosi Tanah..."
              value={subKategori}
              onChange={(e) => setSubKategori(e.target.value)}
              className="bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Tuliskan nama kategori yang paling sesuai dengan permasalahan yang Anda laporkan.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Tingkat Urgensi</Label>
        <Select value={urgensi} onValueChange={setUrgensi}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Darurat", "Tinggi", "Sedang", "Rendah"].map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Deskripsi Lengkap *</Label>
        <Textarea
          placeholder="Jelaskan kondisi lingkungan, waktu kejadian, cakupan dampak..."
          rows={4}
          value={deskripsi}
          maxLength={DESKRIPSI_MAX}
          onChange={(e) => setDeskripsi(e.target.value)}
        />
        <p className={`text-[10px] tabular-nums text-right ${
          deskripsi.length >= DESKRIPSI_MAX ? "text-destructive" : "text-muted-foreground"
        }`}>
          {deskripsi.length} / {DESKRIPSI_MAX}
        </p>
      </div>
    </section>
  );
}
