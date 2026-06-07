"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { DashboardHome } from "@/components/dashboard-admin/dashboard-home";
import { MapPin } from "lucide-react";

function AdminPageContent() {
  const searchParams = useSearchParams();
  const desaId = searchParams.get("id");
  const desaName = searchParams.get("desa");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  return (
    <AdminLayout>
      {(desaName || desaId) && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border bg-primary/5 px-4 py-3 text-sm">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="font-medium">{desaName || "Panel Admin Desa"}</p>
            <p className="text-xs text-muted-foreground">
              {desaId && <span>ID: {desaId.slice(0, 8)}… </span>}
              {lat && lng && (
                <span>
                  Lokasi: {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      <DashboardHome />
    </AdminLayout>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  );
}
