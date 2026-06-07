"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, MapPin, Loader2, Ban, ShieldCheck, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

type Admin = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  villageName: string;
  status: string;
  approvedAt: string;
  deletionPendingAt?: string;
  banInfo?: {
    bannedAt: string;
    bannedUntil: string;
    reason: string;
    proofUrl: string;
    bannedBy: string;
  } | null;
};

export default function OpsAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [confirmImmediate, setConfirmImmediate] = useState(false);

  // Ban States
  const [banUid, setBanUid] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banYears, setBanYears] = useState(0);
  const [banMonths, setBanMonths] = useState(0);
  const [banDays, setBanDays] = useState(0);
  const [banProofUrls, setBanProofUrls] = useState<string[]>([]);
  const [banUploading, setBanUploading] = useState(false);

  function getCleanErrorMessage(err: unknown, fallback: string): string {
    if (!err) return fallback;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Failed to fetch")) {
      return "Gagal terhubung ke server. Silakan periksa koneksi internet Anda.";
    }
    if (msg.includes("Unauthorized")) {
      return "Sesi Anda telah berakhir atau Anda tidak memiliki akses. Silakan masuk kembali.";
    }
    return msg;
  }

  const load = () => {
    fetch("/api/ops/v1/admins")
      .then((r) => r.json())
      .then((d) => setAdmins((d.admins || []).filter((a: Admin) => a.status !== "deleted")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBanUploading(true);
    const newUrls = [...banProofUrls];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("path", "ban-proofs");

        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Gagal mengunggah file ke-${i + 1}`);
        newUrls.push(data.url);
      }
      
      setBanProofUrls(newUrls);
      toast.success(`${files.length} file berhasil diunggah`);
    } catch (err) {
      toast.error(getCleanErrorMessage(err, "Gagal mengunggah bukti"));
    } finally {
      setBanUploading(false);
      // Reset input value agar bisa upload file yang sama lagi jika perlu
      e.target.value = "";
    }
  }

  async function handleBan(uid: string) {
    if (banReason.trim().length < 5) {
      toast.error("Alasan banned minimal 5 karakter");
      return;
    }
    if (banProofUrls.length === 0) {
      toast.error("Wajib mengunggah bukti (gambar/dokumen)");
      return;
    }
    if (banYears === 0 && banMonths === 0 && banDays === 0) {
      toast.error("Silakan tentukan durasi banned minimal 1 hari, 1 bulan, atau 1 tahun");
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/ops/v1/admins/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ban",
          years: banYears,
          months: banMonths,
          days: banDays,
          reason: banReason,
          proofUrl: banProofUrls.join(","), // Tetap kirim string untuk kompatibilitas, atau sesuaikan backend jika perlu
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Akun admin berhasil dibanned.");
      setBanUid(null);
      setBanReason("");
      setBanYears(0);
      setBanMonths(0);
      setBanDays(0);
      setBanProofUrls([]);
      load();
    } catch (err) {
      toast.error(getCleanErrorMessage(err, "Gagal membanned admin"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleUnban(uid: string) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/ops/v1/admins/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Status banned berhasil dicabut.");
      load();
    } catch (err) {
      toast.error(getCleanErrorMessage(err, "Gagal mencabut status banned"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete(uid: string, type: "immediate" | "schedule") {
    if (reason.length < 5) {
      toast.error("Alasan penghapusan wajib diisi");
      return;
    }
    if (type === "immediate" && !confirmImmediate) {
      setConfirmImmediate(true);
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/ops/v1/admins/${uid}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (type === "schedule") {
        toast.success("Penghapusan dijadwalkan. Admin akan melihat banner peringatan.");
      } else {
        toast.success("Akun admin dinonaktifkan (Firebase + MySQL)");
      }
      
      setDeleteUid(null);
      setReason("");
      setConfirmImmediate(false);
      load();
    } catch (err) {
      toast.error(getCleanErrorMessage(err, "Gagal menonaktifkan akun admin"));
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" text="Memuat daftar admin..." /></div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Admin Desa"
        title="Kelola Akun Admin"
        description="Banned sementara atau nonaktifkan admin desa yang melanggar. Superadmin dapat melampirkan bukti pelanggaran berupa gambar atau dokumen."
      />

      {admins.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Belum ada admin desa aktif</p>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <div key={a.uid} className="rounded-xl border p-4 space-y-3 bg-card hover:shadow-sm transition-shadow">
              <div className="flex justify-between flex-wrap gap-2 items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-lg">{a.name}</p>
                    {a.deletionPendingAt && (
                      <Badge variant="destructive" className="text-[10px] h-5">PENDING DELETE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{a.email} · {a.phone}</p>
                  <Badge variant="outline" className="mt-1.5 gap-1 font-medium bg-muted/30">
                    <MapPin className="w-3 h-3 text-primary" />{a.villageName}
                  </Badge>
                </div>
                <div>
                  {a.status === "banned" ? (
                    <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white font-semibold">
                      DIBANNED
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
                      AKTIF
                    </Badge>
                  )}
                </div>
              </div>

              {a.status === "banned" && a.banInfo && (
                <div className="text-sm bg-destructive/5 text-destructive p-4 rounded-xl border border-destructive/10 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-red-600">
                    <Ban className="w-4 h-4" />
                    Detail Penangguhan Akun
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground mt-1">
                    <p><span className="font-semibold text-foreground">Dibanned Oleh:</span> {a.banInfo.bannedBy}</p>
                    <p><span className="font-semibold text-foreground">Batas Waktu:</span> {new Date(a.banInfo.bannedUntil).toLocaleString("id-ID")}</p>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground"><span className="font-semibold text-foreground">Alasan:</span> {a.banInfo.reason}</p>
                  {a.banInfo.proofUrl && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {a.banInfo.proofUrl.split(",").map((url, idx) => (
                        <a 
                          key={idx}
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/15 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> Bukti #{idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {deleteUid === a.uid ? (
                <div className="border-t pt-3 space-y-2">
                  <Textarea
                    placeholder="Alasan penghapusan akun admin..."
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {confirmImmediate && (
                    <p className="text-xs text-destructive font-medium">⚠️ Yakin ingin menghapus akun desa ini secara permanen? Tindakan ini tidak dapat dibatalkan.</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/5" disabled={processing} onClick={() => handleDelete(a.uid, "schedule")}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                      Jadwalkan Hapus
                    </Button>
                    <Button size="sm" variant="destructive" disabled={processing} onClick={() => handleDelete(a.uid, "immediate")}>
                      {confirmImmediate ? "Ya, Hapus Sekarang" : "Hapus Langsung"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDeleteUid(null); setReason(""); setConfirmImmediate(false); }}>Batal</Button>
                  </div>
                </div>
              ) : banUid === a.uid ? (
                <div className="border-t pt-3 space-y-4">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <Ban className="w-4 h-4" />
                    Banned Admin: {a.name}
                  </div>
                  
                  {/* Durasi Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Tentukan Durasi Banned</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Tahun</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={banYears}
                          onChange={(e) => setBanYears(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Bulan</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={banMonths}
                          onChange={(e) => setBanMonths(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Hari</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={banDays}
                          onChange={(e) => setBanDays(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Alasan Banned */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Alasan Pembatasan</label>
                    <Textarea
                      placeholder="Masukkan alasan lengkap kenapa akun admin dibanned..."
                      rows={2}
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                  </div>

                  {/* Bukti Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Unggah Dokumen Bukti (Gambar / PDF)
                    </Label>
                    <div className="flex flex-col gap-3">
                      <Input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        disabled={banUploading}
                        className="cursor-pointer"
                      />
                      
                      {banProofUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {banProofUrls.map((url, idx) => (
                            <div key={idx} className="relative group/proof">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border text-[10px] font-medium pr-16 relative">
                                {url.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                                  <div className="w-6 h-6 rounded bg-black/10 overflow-hidden shrink-0 border border-black/5">
                                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <FileText className="w-3 h-3 shrink-0" />
                                )}
                                <span className="truncate max-w-[80px]">Bukti #{idx + 1}</span>
                                
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                    title="Lihat Full"
                                  >
                                    <Upload className="w-3 h-3 rotate-45" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => setBanProofUrls(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Hapus"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {banUploading && (
                        <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Mengunggah file...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="destructive" disabled={processing || banUploading} onClick={() => handleBan(a.uid)}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
                      Banned Sekarang
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setBanUid(null); setBanReason(""); setBanYears(0); setBanMonths(0); setBanDays(0); setBanProofUrls([]); }}>Batal</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 border-t pt-3">
                  {a.status === "banned" ? (
                    <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50" disabled={processing} onClick={() => handleUnban(a.uid)}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                      Cabut Banned
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50" onClick={() => setBanUid(a.uid)}>
                      <Ban className="w-3.5 h-3.5 mr-1" /> Ban Admin
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteUid(a.uid)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Admin
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
