"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type Log = {
  id: string;
  action: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  at: string;
};

const actionLabel: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  approve_registration: "Setujui Pendaftaran",
  reject_registration: "Tolak Pendaftaran",
  delete_diskusi_post: "Hapus Diskusi",
  delete_admin: "Hapus Admin",
};

export default function OpsAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ops/v1/audit")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" text="Memuat audit log..." /></div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Keamanan"
        title="Audit Log"
        description="Riwayat semua tindakan operasional superadmin."
      />

      {logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Belum ada aktivitas tercatat</p>
      ) : (
        <div className="rounded-xl border divide-y">
          {logs.map((l) => (
            <div key={l.id} className="p-4 flex flex-wrap gap-3 justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{actionLabel[l.action] || l.action}</Badge>
                  <span className="text-xs text-muted-foreground">{l.actorEmail}</span>
                </div>
                <p className="text-xs mt-1 font-mono text-muted-foreground">
                  {l.targetType}/{l.targetId.slice(0, 12)}
                </p>
                {Object.keys(l.details).length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-xl truncate">
                    {JSON.stringify(l.details)}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {l.at ? new Date(l.at).toLocaleString("id-ID") : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
