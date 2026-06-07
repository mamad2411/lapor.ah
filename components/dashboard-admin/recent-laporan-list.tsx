"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrioritasBadge, StatusBadge } from "./status-badge";
import { useAdmin } from "./admin-context";
import type { Laporan } from "./types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RecentLaporanListProps {
  laporan: Laporan[];
  limit?: number;
}

export function RecentLaporanList({ laporan, limit = 5 }: RecentLaporanListProps) {
  const { adminHref } = useAdmin();
  const items = [...laporan]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return (
    <div className="border border-foreground/10 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
        <p className="text-xs font-mono text-muted-foreground">Laporan terbaru</p>
        <Button variant="ghost" size="sm" asChild className="text-xs font-mono h-8">
          <Link href={adminHref("/admin/laporan")}>
            Lihat semua
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-foreground/10">
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted-foreground italic">Belum ada laporan yang masuk.</p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/laporan/${item.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{item.nomor}</span>
                  <PrioritasBadge prioritas={item.prioritas} />
                </div>
                <p className="font-medium truncate">{item.judul}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {item.pelapor.nama} · {item.dusun} · RT {item.rt}/RW {item.rw}
                </p>
              </div>
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                <StatusBadge status={item.status} />
                <span className="text-xs font-mono text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
