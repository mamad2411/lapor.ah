"use client";

import Link from "next/link";
import { Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PrioritasBadge, StatusBadge } from "./status-badge";
import { useAdmin } from "./admin-context";
import type { Laporan } from "./types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface LaporanTableProps {
  laporan: Laporan[];
}

export function LaporanTable({ laporan }: LaporanTableProps) {
  const { adminHref } = useAdmin();

  if (laporan.length === 0) {
    return (
      <div className="border border-foreground/10 rounded-lg p-12 text-center">
        <p className="font-display text-xl mb-2">Tidak ada laporan</p>
        <p className="text-sm text-muted-foreground">Coba ubah filter pencarian Anda.</p>
      </div>
    );
  }

  return (
    <div className="border border-foreground/10 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-foreground/10 hover:bg-transparent">
              <TableHead className="font-mono text-xs">Nomor</TableHead>
              <TableHead className="font-mono text-xs">Judul</TableHead>
              <TableHead className="font-mono text-xs hidden md:table-cell">Pelapor</TableHead>
              <TableHead className="font-mono text-xs hidden lg:table-cell">Wilayah</TableHead>
              <TableHead className="font-mono text-xs hidden sm:table-cell">Kategori</TableHead>
              <TableHead className="font-mono text-xs">Prioritas</TableHead>
              <TableHead className="font-mono text-xs">Status</TableHead>
              <TableHead className="font-mono text-xs hidden md:table-cell">Tanggal</TableHead>
              <TableHead className="font-mono text-xs w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {laporan.map((item) => (
              <TableRow key={item.id} className="border-foreground/10">
                <TableCell className="font-mono text-xs">{item.nomor}</TableCell>
                <TableCell>
                  <Link
                    href={adminHref(`/admin/laporan/${item.id}`)}
                    className="font-medium hover:underline underline-offset-4 line-clamp-1"
                  >
                    {item.judul}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {item.pelapor.nama}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {item.dusun}
                  <span className="block text-xs font-mono">RT {item.rt}/RW {item.rw}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {item.kategori}
                </TableCell>
                <TableCell>
                  <PrioritasBadge prioritas={item.prioritas} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={adminHref(`/admin/laporan/${item.id}`)}>
                          <Eye className="size-4" />
                          Lihat detail
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-foreground/10 px-4 py-3 text-xs font-mono text-muted-foreground">
        Menampilkan {laporan.length} laporan
      </div>
    </div>
  );
}
