"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { RegistrationPreview } from "@/components/superadmin/registration-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { getDbClient } from "@/lib/firebase/client";
import { Check, X, MapPin, ShieldOff, Eye, FileCheck, FileWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Registration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  villageName: string;
  villageId: string;
  position: string;
  notes?: string;
  documents: { type: string; url: string; number?: string }[];
  status: string;
  createdAt: string;
  latitude?: string;
  longitude?: string;
  documentValid?: boolean | null;
  documentScore?: number | null;
};

export default function OpsRegistrationsPage() {
  const router = useRouter();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // Real-time listener untuk pendaftaran pending
  useEffect(() => {
    const db = getDbClient();
    const q = query(
      collection(db, "pending_registrations"),
      where("status", "==", "pending_superadmin"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          villageName: d.villageName,
          villageId: d.villageId,
          position: d.position,
          status: d.status,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          documentValid: d.documentVerification?.valid ?? null,
          documentScore: d.documentVerification?.score ?? null,
          latitude: d.latitude,
          longitude: d.longitude,
        } as Registration;
      });
      setRegs(list);
      setLoading(false);
    }, (err) => {
      console.error("Registrations listener error:", err);
      if (err.message.includes("permission-denied")) {
        setUnauthorized(true);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  async function handleVerify(id: string, action: "approve" | "reject") {
    if (action === "reject" && reason.length < 5) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }

    // Optimistic UI: hapus dari list sebelum request selesai
    const originalRegs = [...regs];
    setRegs((prev) => prev.filter((r) => r.id !== id));
    
    setProcessing(id);
    try {
      const res = await fetch(`/api/ops/v1/registrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === "approve") {
        toast.success("Disetujui — link admin dikirim ke email/WA calon admin");
      } else {
        toast.success("Ditolak — alasan & link penolakan dikirim");
      }
      setRejectId(null);
      setReason("");
    } catch (err) {
      // Rollback jika gagal
      setRegs(originalRegs);
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" text="Memuat pendaftaran pending..." /></div>;
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-semibold">Sesi Tidak Valid</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Login ulang dengan Ctrl+Z+A+I dari halaman utama.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Pendaftaran"
        title="Permintaan Admin Desa"
        description="Preview profil, dokumen, dan lokasi sebelum menyetujui atau menolak."
      />

      <RegistrationPreview
        registrationId={previewId}
        open={!!previewId}
        onOpenChange={(o) => !o && setPreviewId(null)}
      />

      {regs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Tidak ada pendaftaran menunggu</p>
      ) : (
        <div className="space-y-4">
          {regs.map((r) => (
            <div key={r.id} className="rounded-xl border p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.email} · {r.phone}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="w-3 h-3" />{r.villageName}
                    </Badge>
                    {r.documentValid === true && (
                      <Badge className="bg-green-600 gap-1">
                        <FileCheck className="w-3 h-3" /> Dokumen OK ({r.documentScore})
                      </Badge>
                    )}
                    {r.documentValid === false && (
                      <Badge variant="destructive" className="gap-1">
                        <FileWarning className="w-3 h-3" /> Dokumen perlu review
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Jabatan: {r.position || "—"} · {r.latitude}, {r.longitude}
              </p>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" variant="secondary" onClick={() => setPreviewId(r.id)}>
                  <Eye className="w-4 h-4 mr-1" /> Preview Lengkap
                </Button>
              </div>

              {rejectId === r.id ? (
                <div className="space-y-2 border-t pt-3">
                  <Textarea
                    placeholder="Alasan penolakan (wajib)..."
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processing === r.id}
                      onClick={() => handleVerify(r.id, "reject")}
                    >
                      {processing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                      Kirim Penolakan
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setReason(""); }}>Batal</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={processing === r.id} onClick={() => handleVerify(r.id, "approve")}>
                    {processing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Setujui
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectId(r.id)}>
                    <X className="w-4 h-4 mr-1" /> Tolak
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
