"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Warga } from "./types";

interface MasyarakatTableProps {
  warga: Warga[];
}

export function MasyarakatTable({ warga }: MasyarakatTableProps) {
  return (
    <div className="border border-foreground/10 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-foreground/10 hover:bg-transparent">
              <TableHead className="font-mono text-xs">Nama</TableHead>
              <TableHead className="font-mono text-xs hidden md:table-cell">NIK</TableHead>
              <TableHead className="font-mono text-xs hidden sm:table-cell">Telepon</TableHead>
              <TableHead className="font-mono text-xs">Dusun</TableHead>
              <TableHead className="font-mono text-xs hidden lg:table-cell">RT/RW</TableHead>
              <TableHead className="font-mono text-xs text-right">Laporan</TableHead>
              <TableHead className="font-mono text-xs hidden md:table-cell">Terakhir aktif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warga.map((item) => (
              <TableRow key={item.id} className="border-foreground/10">
                <TableCell className="font-medium">{item.nama}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                  {item.nik}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{item.telepon}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.dusun}</TableCell>
                <TableCell className="hidden lg:table-cell font-mono text-xs">
                  RT {item.rt}/RW {item.rw}
                </TableCell>
                <TableCell className="text-right font-display text-lg">{item.totalLaporan}</TableCell>
                <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">
                  {new Date(item.terakhirAktif).toLocaleDateString("id-ID")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-foreground/10 px-4 py-3 text-xs font-mono text-muted-foreground">
        {warga.length} warga terdaftar
      </div>
    </div>
  );
}
