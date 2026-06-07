"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DUSUN_LIST, KATEGORI_LIST } from "./mock-data";
import type { PrioritasLaporan, StatusLaporan } from "./types";

export interface LaporanFilterState {
  search: string;
  status: StatusLaporan | "semua";
  kategori: string;
  dusun: string;
  prioritas: PrioritasLaporan | "semua";
}

export const defaultFilters: LaporanFilterState = {
  search: "",
  status: "semua",
  kategori: "semua",
  dusun: "semua",
  prioritas: "semua",
};

interface LaporanFiltersProps {
  filters: LaporanFilterState;
  onChange: (filters: LaporanFilterState) => void;
}

export function LaporanFilters({ filters, onChange }: LaporanFiltersProps) {
  const hasActive =
    filters.search ||
    filters.status !== "semua" ||
    filters.kategori !== "semua" ||
    filters.dusun !== "semua" ||
    filters.prioritas !== "semua";

  return (
    <div className="border border-foreground/10 rounded-lg p-4 bg-foreground/[0.01] space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Cari nomor, judul, atau nama pelapor..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 border-foreground/10"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ ...filters, status: v as LaporanFilterState["status"] })}
        >
          <SelectTrigger className="border-foreground/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="Belum di Proses">Belum di Proses</SelectItem>
            <SelectItem value="Sedang di Proses">Sedang di Proses</SelectItem>
            <SelectItem value="Selesai">Selesai</SelectItem>
            <SelectItem value="Ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.kategori}
          onValueChange={(v) => onChange({ ...filters, kategori: v })}
        >
          <SelectTrigger className="border-foreground/10">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua kategori</SelectItem>
            {KATEGORI_LIST.map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.dusun}
          onValueChange={(v) => onChange({ ...filters, dusun: v })}
        >
          <SelectTrigger className="border-foreground/10">
            <SelectValue placeholder="Dusun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua dusun</SelectItem>
            {DUSUN_LIST.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.prioritas}
          onValueChange={(v) => onChange({ ...filters, prioritas: v as LaporanFilterState["prioritas"] })}
        >
          <SelectTrigger className="border-foreground/10">
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua prioritas</SelectItem>
            <SelectItem value="Darurat">Darurat</SelectItem>
            <SelectItem value="Tinggi">Tinggi</SelectItem>
            <SelectItem value="Sedang">Sedang</SelectItem>
            <SelectItem value="Rendah">Rendah</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs font-mono"
          onClick={() => onChange(defaultFilters)}
        >
          <X className="size-3.5" />
          Reset filter
        </Button>
      )}
    </div>
  );
}

export function filterLaporan<T extends { judul: string; nomor: string; status: string; kategori: string; dusun: string; prioritas: string; pelapor: { nama: string } }>(
  items: T[],
  filters: LaporanFilterState
): T[] {
  const q = filters.search.toLowerCase().trim();
  return items.filter((item) => {
    if (q && ![
      item.judul,
      item.nomor,
      item.pelapor.nama,
      item.kategori,
      item.dusun,
    ].some((f) => f.toLowerCase().includes(q))) return false;
    if (filters.status !== "semua" && item.status !== filters.status) return false;
    if (filters.kategori !== "semua" && item.kategori !== filters.kategori) return false;
    if (filters.dusun !== "semua" && item.dusun !== filters.dusun) return false;
    if (filters.prioritas !== "semua" && item.prioritas !== filters.prioritas) return false;
    return true;
  });
}
