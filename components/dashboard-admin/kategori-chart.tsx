"use client";

import type { Laporan } from "./types";

interface KategoriChartProps {
  laporan: Laporan[];
}

export function KategoriChart({ laporan }: KategoriChartProps) {
  const counts = laporan.reduce<Record<string, number>>((acc, l) => {
    acc[l.kategori] = (acc[l.kategori] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;

  return (
    <div className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01]">
      <p className="text-xs font-mono text-muted-foreground mb-4">Distribusi kategori</p>
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground italic">Tidak ada data kategori.</p>
          </div>
        ) : (
          sorted.map(([kategori, count]) => (
            <div key={kategori}>
              <div className="flex items-center justify-between text-sm mb-1.5 gap-4">
                <span className="truncate text-muted-foreground">{kategori}</span>
                <span className="font-mono shrink-0">{count}</span>
              </div>
              <div className="h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/70 rounded-full transition-all duration-700"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
