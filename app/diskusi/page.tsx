"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WargaShell } from "@/components/warga/warga-shell";
import { DiskusiFeed } from "@/components/warga/diskusi-feed";

function DiskusiContent() {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag");

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
          Komunitas Desa
        </p>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight mb-3">Diskusi Masyarakat</h1>
        <p className="text-muted-foreground max-w-2xl">
          Komunitas ala Reddit — balas tanpa like, kirim stiker, buat polling, dan cari trending hashtag seperti X.
          {tag && (
            <span className="block mt-1 text-primary">Filter: #{tag}</span>
          )}
        </p>
      </div>
      <DiskusiFeed initialTag={tag || undefined} />
    </>
  );
}

export default function DiskusiPage() {
  return (
    <WargaShell wide>
      <Suspense fallback={null}>
        <DiskusiContent />
      </Suspense>
    </WargaShell>
  );
}
