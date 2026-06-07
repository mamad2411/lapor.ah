"use client";

import { useState } from "react";
import { Loader2, Upload, FileText, X as CloseIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type DocumentVerificationState = {
  valid: boolean;
  score: number;
  checks: { name: string; passed: boolean; detail: string }[];
  fileHash: string;
} | null;

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onVerificationChange: (result: DocumentVerificationState) => void;
  verification: DocumentVerificationState;
};

export function DocumentUpload({
  label,
  value,
  onChange,
  onVerificationChange,
  verification,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    onVerificationChange(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "registrations");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah");

      onChange(data.url);
      toast.success("Dokumen berhasil diunggah, memverifikasi...");
      await verifyDocument(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah dokumen");
    } finally {
      setUploading(false);
    }
  };

  const verifyDocument = async (url: string) => {
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verifikasi gagal");

      onVerificationChange(data);
      if (data.valid) {
        toast.success(`Dokumen terverifikasi (${data.score}%)`);
      } else {
        toast.error("Dokumen tidak lulus verifikasi keaslian");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verifikasi gagal");
      onVerificationChange(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = () => {
    onChange("");
    onVerificationChange(null);
  };

  const isPdf = value.toLowerCase().endsWith(".pdf");
  const isWord = value.toLowerCase().endsWith(".doc") || value.toLowerCase().endsWith(".docx");

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <p className="text-[11px] text-muted-foreground">
        Unggah surat pengesahan resmi Kepala Desa (PDF/Word/JPG/PNG). Sistem akan memverifikasi
        keaslian dokumen — deteksi AI, editan, dan integritas file secara ketat.
      </p>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all min-h-[160px] flex items-center justify-center
          ${dragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/20 hover:border-primary/40"}
          ${value ? "p-3" : "p-6"}
        `}
      >
        {value ? (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {isPdf || isWord ? (
                <FileText className="w-10 h-10 text-primary shrink-0" />
              ) : (
                <img src={value} alt="Dokumen" className="w-16 h-16 object-cover rounded-md" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{value.split("/").pop()}</p>
                {verifying ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Memverifikasi...
                  </p>
                ) : verification?.valid ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Terverifikasi ({verification.score}%)
                  </p>
                ) : verification && !verification.valid ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Tidak lulus verifikasi
                  </p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={handleRemove}>
                <CloseIcon className="w-4 h-4" />
              </Button>
            </div>

            {verification && (
              <div className="space-y-1">
                {verification.checks.map((check) => (
                  <div
                    key={check.name}
                    className={`flex items-start gap-2 text-[10px] px-2 py-1 rounded ${
                      check.passed ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    )}
                    <span>{check.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-2">
            <input
              type="file"
              className="hidden"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
              disabled={uploading}
            />
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <>
                <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">
                  {dragActive ? "Lepaskan dokumen di sini" : "Drag & drop atau klik untuk unggah"}
                </span>
                <span className="text-[10px] text-muted-foreground">PDF, Word, JPG, PNG — maks. 10 MB</span>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}
