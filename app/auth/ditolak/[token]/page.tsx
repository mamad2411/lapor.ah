"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { WargaShell } from "@/components/warga/warga-shell";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";

export default function DitolakPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<{
    villageName: string;
    name: string;
    reason: string;
    rejectedAt: string;
    rejectionToken: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/auth/ditolak/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <WargaShell>
      <div className="max-w-lg mx-auto py-12">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : error ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button asChild><Link href="/">Kembali</Link></Button>
          </div>
        ) : data ? (
          <div className="space-y-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <div>
              <h1 className="font-display text-2xl">Pendaftaran Ditolak</h1>
              <p className="text-muted-foreground mt-2">
                Halo {data.name}, pendaftaran desa <strong>{data.villageName}</strong> belum dapat disetujui.
              </p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-left">
              <p className="text-sm font-medium mb-2">Alasan penolakan:</p>
              <p className="text-sm whitespace-pre-wrap">{data.reason}</p>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Token penolakan: {data.rejectionToken}
            </p>
            {data.rejectedAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(data.rejectedAt).toLocaleString("id-ID")}
              </p>
            )}
            <Button asChild variant="outline">
              <Link href="/auth/permintaan">Ajukan Ulang Pendaftaran</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </WargaShell>
  );
}
