import { MapPin } from "lucide-react";
import type { StatistikWilayah } from "./types";

interface WilayahOverviewProps {
  data: StatistikWilayah[];
}

export function WilayahOverview({ data }: WilayahOverviewProps) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {data.map((wilayah) => (
        <div
          key={wilayah.dusun}
          className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01] hover-lift"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <MapPin className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{wilayah.dusun}</p>
                <p className="text-xs font-mono text-muted-foreground">{wilayah.total} laporan total</p>
              </div>
            </div>
            <span className="font-display text-2xl">{wilayah.total}</span>
          </div>

          <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-foreground/60 rounded-full"
              style={{ width: `${(wilayah.total / maxTotal) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border border-foreground/10 rounded p-2">
              <p className="font-display text-lg text-red-600 dark:text-red-400">{wilayah.belum}</p>
              <p className="text-xs font-mono text-muted-foreground">Belum</p>
            </div>
            <div className="border border-foreground/10 rounded p-2">
              <p className="font-display text-lg text-orange-600 dark:text-orange-400">{wilayah.proses}</p>
              <p className="text-xs font-mono text-muted-foreground">Proses</p>
            </div>
            <div className="border border-foreground/10 rounded p-2">
              <p className="font-display text-lg text-green-600 dark:text-green-400">{wilayah.selesai}</p>
              <p className="text-xs font-mono text-muted-foreground">Selesai</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
