"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notifikasi } from "./types";

const jenisIcon = {
  baru: Bell,
  darurat: AlertTriangle,
  tenggat: Clock,
  umpan_balik: MessageSquare,
  status: CheckCircle,
};

const jenisStyle = {
  baru: "text-foreground",
  darurat: "text-red-600 dark:text-red-400",
  tenggat: "text-orange-600 dark:text-orange-400",
  umpan_balik: "text-green-600 dark:text-green-400",
  status: "text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface NotifikasiListProps {
  notifikasi: Notifikasi[];
}

export function NotifikasiList({ notifikasi }: NotifikasiListProps) {
  const sorted = [...notifikasi].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="border border-foreground/10 rounded-lg divide-y divide-foreground/10 overflow-hidden">
      {sorted.length === 0 ? (
        <div className="px-5 py-12 text-center bg-foreground/[0.01]">
          <p className="text-sm text-muted-foreground italic">Tidak ada notifikasi baru.</p>
        </div>
      ) : (
        sorted.map((item) => {
          const Icon = jenisIcon[item.jenis];
          const content = (
            <div
              className={cn(
                "flex items-start gap-4 px-5 py-4 transition-colors",
                !item.dibaca && "bg-foreground/[0.03]",
                item.laporanId && "hover:bg-foreground/[0.02] cursor-pointer"
              )}
            >
              <Icon className={cn("size-5 shrink-0 mt-0.5", jenisStyle[item.jenis])} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{item.judul}</p>
                  {!item.dibaca && (
                    <span className="size-2 rounded-full bg-foreground shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.pesan}</p>
                <p className="text-xs font-mono text-muted-foreground mt-2">{formatDate(item.createdAt)}</p>
              </div>
            </div>
          );

          return item.laporanId ? (
            <Link key={item.id} href={`/admin/laporan/${item.laporanId}`}>
              {content}
            </Link>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })
      )}
    </div>
  );
}
