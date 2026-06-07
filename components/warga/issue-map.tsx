"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const RegisterMap = dynamic(() => import("@/components/auth/register-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center rounded-lg">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  ),
});

export function IssueMap({
  position,
  setPosition,
  villageName,
}: {
  position: [number, number];
  setPosition: (p: [number, number]) => void;
  villageName?: string;
}) {
  return (
    <RegisterMap mapPosition={position} setMapPosition={setPosition} villageName={villageName} />
  );
}
