"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  User,
  MapPin,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RegistrationDetail = {
  id: string;
  name: string;
  email: string;
  phone: string;
  nik: string;
  villageName: string;
  latitude: string;
  longitude: string;
  position: string;
  profileImage: string | null;
  villageThumbnail: string | null;
  approvalDocument: string | null;
  documentVerification: {
    valid: boolean;
    score: number;
    fileHash: string;
    checks: { name: string; passed: boolean; detail: string }[];
    verifiedAt: string;
  } | null;
  security: { enable2FA: boolean; dataSupport: boolean };
  status: string;
  submittedAt: string;
  createdAt: string;
  mapsUrl: string | null;
};

interface RegistrationPreviewProps {
  registrationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MediaPreview({ url, label }: { url: string; label: string }) {
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {isPdf ? (
        <div className="rounded-lg border p-4 flex items-center justify-between gap-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-sm">Dokumen PDF</span>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              Buka <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt={label}
            className="rounded-lg border max-h-48 w-full object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      )}
    </div>
  );
}

export function RegistrationPreview({ registrationId, open, onOpenChange }: RegistrationPreviewProps) {
  const [data, setData] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !registrationId) {
      setData(null);
      setError("");
      return;
    }
    setLoading(true);
    fetch(`/api/ops/v1/registrations/${registrationId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d.registration);
      })
      .catch(() => setError("Gagal memuat detail"))
      .finally(() => setLoading(false));
  }, [open, registrationId]);

  const docOk = data?.documentVerification?.valid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display flex items-center gap-2">
            <User className="w-5 h-5" />
            Preview Permintaan Pendaftaran
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && <p className="text-destructive text-sm text-center py-8">{error}</p>}
            {data && (
              <>
                {/* Profil */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" /> Profil Calon Admin
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Nama:</span> {data.name}</div>
                    <div><span className="text-muted-foreground">NIK:</span> <span className="font-mono">{data.nik}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> {data.email}</div>
                    <div><span className="text-muted-foreground">Telepon:</span> {data.phone}</div>
                    <div><span className="text-muted-foreground">Jabatan:</span> {data.position || "—"}</div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      2FA: {data.security.enable2FA ? "Aktif" : "Tidak"}
                    </div>
                  </div>
                  {data.profileImage && (
                    <MediaPreview url={data.profileImage} label="Foto Profil" />
                  )}
                </section>

                {/* Desa & Lokasi */}
                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Desa & Lokasi
                  </h3>
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                    <p className="font-medium">{data.villageName}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {data.latitude}, {data.longitude}
                    </p>
                    {data.mapsUrl && (
                      <Button size="sm" variant="outline" asChild className="mt-2">
                        <a href={data.mapsUrl} target="_blank" rel="noopener noreferrer">
                          Lihat di Google Maps <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                  {data.villageThumbnail && (
                    <MediaPreview url={data.villageThumbnail} label="Thumbnail Desa" />
                  )}
                </section>

                {/* Dokumen Pengesahan */}
                <section className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Dokumen Pengesahan
                    </h3>
                    {data.documentVerification && (
                      <Badge
                        variant={docOk ? "default" : "destructive"}
                        className={cn(docOk && "bg-green-600")}
                      >
                        {docOk ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Dapat Diterima</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" /> Perlu Ditinjau Ulang</>
                        )}
                      </Badge>
                    )}
                  </div>

                  {data.approvalDocument && (
                    <MediaPreview url={data.approvalDocument} label="Surat Pengesahan / Dokumen Resmi" />
                  )}

                  {data.documentVerification && (
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                      <div className="flex justify-between text-sm">
                        <span>Skor verifikasi otomatis</span>
                        <span className="font-semibold">{data.documentVerification.score}/100</span>
                      </div>
                      {data.documentVerification.fileHash && (
                        <p className="text-[10px] font-mono text-muted-foreground break-all">
                          Hash: {data.documentVerification.fileHash}
                        </p>
                      )}
                      <ul className="space-y-2">
                        {data.documentVerification.checks.map((c) => (
                          <li
                            key={c.name}
                            className={cn(
                              "text-xs rounded-md px-3 py-2 border",
                              c.passed ? "bg-green-50 border-green-200 dark:bg-green-950/20" : "bg-red-50 border-red-200 dark:bg-red-950/20"
                            )}
                          >
                            <div className="flex items-center gap-1.5 font-medium">
                              {c.passed ? (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-600" />
                              )}
                              {c.name}
                            </div>
                            <p className="text-muted-foreground mt-0.5">{c.detail}</p>
                          </li>
                        ))}
                      </ul>
                      {data.documentVerification.verifiedAt && (
                        <p className="text-[10px] text-muted-foreground">
                          Diverifikasi: {new Date(data.documentVerification.verifiedAt).toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <p className="text-[10px] text-muted-foreground border-t pt-4">
                  Diajukan: {data.submittedAt ? new Date(data.submittedAt).toLocaleString("id-ID") : data.createdAt ? new Date(data.createdAt).toLocaleString("id-ID") : "—"}
                </p>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
