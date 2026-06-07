"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./village-map-inner";
export type { MapPoint };

const VillageMapInner = dynamic(() => import("./village-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] rounded-lg border border-foreground/10 bg-muted/30 animate-pulse" />
  ),
});

interface VillageMapProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  height?: number;
}

export function VillageMap(props: VillageMapProps) {
  return <VillageMapInner {...props} />;
}
