"use client";

import { useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Clock, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

interface StatsOverviewProps {
  stats: {
    baruHariIni: number;
    menunggu: number;
    sedangProses: number;
    selesaiMinggu: number;
    darurat: number;
    total: number;
    byRange?: {
      hari: { baru: number; menunggu: number; sedangProses: number; selesai: number; darurat: number; total: number };
      minggu: { baru: number; menunggu: number; sedangProses: number; selesai: number; darurat: number; total: number };
      bulan: { baru: number; menunggu: number; sedangProses: number; selesai: number; darurat: number; total: number };
      tahun: { baru: number; menunggu: number; sedangProses: number; selesai: number; darurat: number; total: number };
      semua: { baru: number; menunggu: number; sedangProses: number; selesai: number; darurat: number; total: number };
    };
  };
}

type RangeType = 'hari' | 'minggu' | 'bulan' | 'tahun' | 'semua';

export function StatsOverview({ stats }: StatsOverviewProps) {
  const [range, setRange] = useState<RangeType>('semua');

  const currentStats = stats.byRange ? stats.byRange[range] : null;

  const values = currentStats ? {
    baru: currentStats.baru,
    menunggu: currentStats.menunggu,
    sedangProses: currentStats.sedangProses,
    selesai: currentStats.selesai,
    darurat: currentStats.darurat,
    total: currentStats.total,
  } : {
    baru: stats.baruHariIni,
    menunggu: stats.menunggu,
    sedangProses: stats.sedangProses,
    selesai: stats.selesaiMinggu,
    darurat: stats.darurat,
    total: stats.total,
  };

  const getLabel = (type: 'baru' | 'menunggu' | 'proses' | 'selesai' | 'darurat' | 'total') => {
    if (type === 'baru') {
      if (range === 'hari') return "Laporan baru hari ini";
      if (range === 'minggu') return "Laporan baru minggu ini";
      if (range === 'bulan') return "Laporan baru bulan ini";
      if (range === 'tahun') return "Laporan baru tahun ini";
      return "Laporan baru (Semua Waktu)";
    }
    if (type === 'menunggu') {
      if (range === 'hari') return "Menunggu tindak lanjut (Hari Ini)";
      if (range === 'minggu') return "Menunggu tindak lanjut (Minggu Ini)";
      if (range === 'bulan') return "Menunggu tindak lanjut (Bulan Ini)";
      if (range === 'tahun') return "Menunggu tindak lanjut (Tahun Ini)";
      return "Menunggu tindak lanjut";
    }
    if (type === 'proses') {
      if (range === 'hari') return "Sedang diproses (Hari Ini)";
      if (range === 'minggu') return "Sedang diproses (Minggu Ini)";
      if (range === 'bulan') return "Sedang diproses (Bulan Ini)";
      if (range === 'tahun') return "Sedang diproses (Tahun Ini)";
      return "Sedang diproses";
    }
    if (type === 'selesai') {
      if (range === 'hari') return "Selesai hari ini";
      if (range === 'minggu') return "Selesai minggu ini";
      if (range === 'bulan') return "Selesai bulan ini";
      if (range === 'tahun') return "Selesai tahun ini";
      return "Selesai (Semua Waktu)";
    }
    if (type === 'darurat') {
      if (range === 'hari') return "Laporan darurat aktif (Hari Ini)";
      if (range === 'minggu') return "Laporan darurat aktif (Minggu Ini)";
      if (range === 'bulan') return "Laporan darurat aktif (Bulan Ini)";
      if (range === 'tahun') return "Laporan darurat aktif (Tahun Ini)";
      return "Laporan darurat aktif";
    }
    if (type === 'total') {
      if (range === 'hari') return "Total laporan aktif (Hari Ini)";
      if (range === 'minggu') return "Total laporan aktif (Minggu Ini)";
      if (range === 'bulan') return "Total laporan aktif (Bulan Ini)";
      if (range === 'tahun') return "Total laporan aktif (Tahun Ini)";
      return "Total laporan aktif";
    }
    return "";
  };

  const cards: StatCard[] = [
    { label: getLabel('baru'), value: values.baru, icon: FileText },
    { label: getLabel('menunggu'), value: values.menunggu, icon: Clock, highlight: values.menunggu > 0 },
    { label: getLabel('proses'), value: values.sedangProses, icon: Loader2 },
    { label: getLabel('selesai'), value: values.selesai, icon: CheckCircle2 },
    { label: getLabel('darurat'), value: values.darurat, icon: AlertTriangle, highlight: values.darurat > 0 },
    { label: getLabel('total'), value: values.total, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01]">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">Rentang Waktu Laporan</span>
        </div>
        <div className="w-full sm:w-48">
          <Select value={range} onValueChange={(val) => setRange(val as RangeType)}>
            <SelectTrigger className="h-9 border-foreground/10 bg-background/50 text-xs font-medium rounded-lg">
              <SelectValue placeholder="Pilih Rentang" />
            </SelectTrigger>
            <SelectContent className="border-foreground/10 rounded-lg">
              <SelectItem value="hari" className="text-xs">Hari Ini</SelectItem>
              <SelectItem value="minggu" className="text-xs">Minggu Ini</SelectItem>
              <SelectItem value="bulan" className="text-xs">Bulan Ini</SelectItem>
              <SelectItem value="tahun" className="text-xs">Tahun Ini</SelectItem>
              <SelectItem value="semua" className="text-xs">Semua Waktu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                "border border-foreground/10 rounded-lg p-5 bg-foreground/[0.01] hover-lift transition-all duration-300",
                card.highlight && "border-orange-500/30 bg-orange-500/[0.03]"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-2">{card.label}</p>
                  <p className="font-display text-3xl lg:text-4xl tracking-tight transition-all duration-300">
                    {card.value}
                  </p>
                </div>
                <Icon className={cn("size-5 text-muted-foreground shrink-0 mt-1", Icon === Loader2 && "animate-spin")} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

