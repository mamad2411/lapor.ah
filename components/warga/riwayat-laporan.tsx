"use client";

import { useEffect, useState } from "react";
import { getReportHistory, ReportHistory } from "@/lib/warga/history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Copy, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export function RiwayatLaporan() {
  const [history, setHistory] = useState<ReportHistory[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(getReportHistory());
    setMounted(true);
  }, []);

  if (!mounted || history.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-none lg:shadow-sm w-full overflow-hidden">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">Riwayat Laporan (Device Ini)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        <div className="grid gap-2">
          {history.slice(0, 3).map((item) => (
            <div 
              key={item.ticketId}
              className="group relative flex items-center justify-between p-3 rounded-xl border bg-background hover:border-primary/50 transition-colors min-w-0 overflow-hidden"
            >
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider truncate">
                  {item.villageName || "Desa"} • {new Date(item.createdAt).toLocaleDateString("id-ID")}
                </span>
                <span className="font-mono font-bold text-sm truncate">
                  {item.ticketId}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    navigator.clipboard.writeText(item.ticketId);
                    toast.success("Disalin");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                  asChild
                >
                  <Link href={`/laporan/lacak?ticketId=${item.ticketId}&pin=${item.trackingPin}`}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {history.length > 3 && (
          <p className="text-[10px] text-center text-muted-foreground">
            Menampilkan 3 laporan terbaru dari total {history.length} laporan.
          </p>
        )}

        <div className="pt-2">
          <Button variant="link" className="h-auto p-0 text-xs text-primary gap-1" asChild>
            <Link href="/laporan/lacak">
              Lihat semua & lacak status <ChevronRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
