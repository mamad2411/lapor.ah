import { cn } from "@/lib/utils";
import type { PrioritasLaporan, StatusLaporan } from "./types";

const statusStyles: Record<StatusLaporan, string> = {
  "Belum di Proses":
    "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
  "Sedang di Proses":
    "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  Selesai:
    "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
  Ditolak:
    "bg-muted text-muted-foreground border-foreground/10",
};

const prioritasStyles: Record<PrioritasLaporan, string> = {
  Darurat: "bg-red-600 text-white border-red-600",
  Tinggi: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/25",
  Sedang: "bg-foreground/5 text-foreground border-foreground/15",
  Rendah: "bg-muted text-muted-foreground border-foreground/10",
};

export function StatusBadge({ status }: { status: StatusLaporan }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-mono border rounded",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

export function PrioritasBadge({ prioritas }: { prioritas: PrioritasLaporan }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-mono border rounded",
        prioritasStyles[prioritas]
      )}
    >
      {prioritas}
    </span>
  );
}
