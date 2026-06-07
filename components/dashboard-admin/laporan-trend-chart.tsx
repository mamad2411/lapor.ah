"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatistikBulanan } from "./types";

interface LaporanTrendChartProps {
  data: StatistikBulanan[];
}

export function LaporanTrendChart({ data }: LaporanTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01]">
        <p className="text-xs font-mono text-muted-foreground mb-4">Tren laporan 6 bulan terakhir</p>
        <div className="h-[240px] w-full flex items-center justify-center border border-dashed border-foreground/10 rounded-md">
          <p className="text-xs text-muted-foreground italic">Belum ada data tren laporan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01]">
      <p className="text-xs font-mono text-muted-foreground mb-4">Tren laporan 6 bulan terakhir</p>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--foreground)" opacity={0.08} />
            <XAxis
              dataKey="bulan"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--foreground)", opacity: 0.1 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid color-mix(in oklch, var(--foreground) 10%, transparent)",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
              }}
            />
            <Bar dataKey="masuk" name="Masuk" fill="var(--foreground)" opacity={0.85} radius={[2, 2, 0, 0]} />
            <Bar dataKey="selesai" name="Selesai" fill="var(--muted-foreground)" opacity={0.5} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
