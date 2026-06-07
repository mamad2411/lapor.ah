"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Glitchy404 } from "@/components/ui/glitchy-404-1";
import Link from "next/link";

export default function NotFound() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const color = !mounted ? "#888" : theme === "dark" ? "#fff" : "#000";

  return (
    <div className="min-h-screen overflow-hidden flex flex-col items-center justify-center gap-8 px-4">
      <div className="w-full max-w-3xl mx-auto">
        <Glitchy404 width={800} height={232} color={color} />
      </div>

      <div className="text-center space-y-2">
        <p className="text-muted-foreground text-sm sm:text-base">
          Halaman yang kamu cari tidak ditemukan.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link
            href="/"
            className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground transition-colors"
          >
            ← Kembali ke beranda
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link
            href="/laporan"
            className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground transition-colors"
          >
            Buat laporan
          </Link>
        </div>
      </div>
    </div>
  );
}
