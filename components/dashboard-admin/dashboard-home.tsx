"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAdmin } from "./admin-context";
import { NotifikasiList } from "./notifikasi-list";
import { RecentLaporanList } from "./recent-laporan-list";
import { SectionHeading } from "./section-heading";
import { StatsOverview } from "./stats-overview";
import { Spinner } from "@/components/ui/spinner";
import { getAuthClient } from "@/lib/firebase/client";

// Lazy load heavy chart components
const LaporanTrendChart = dynamic(() => import("./laporan-trend-chart").then(m => m.LaporanTrendChart), { 
  ssr: false,
  loading: () => <div className="h-[240px] rounded-lg bg-muted/20 animate-pulse" />
});

const KategoriChart = dynamic(() => import("./kategori-chart").then(m => m.KategoriChart), { 
  ssr: false,
  loading: () => <div className="h-[240px] rounded-lg bg-muted/20 animate-pulse" />
});

export function DashboardHome() {
  const { profile, queryString } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    ringkasan: any;
    trend: any[];
    preview: any[];
  } | null>(null);

  useEffect(() => {
    if (!profile) return;
    const fetchStats = async () => {
      try {
        const auth = getAuthClient();
        const user = auth.currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();

        const id = new URLSearchParams(queryString).get("id");
        const res = await fetch(`/api/admin/statistik/bulanan?villageId=${id || profile.uid}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const d = await res.json();
        if (res.ok) setData(d);
      } catch (err) {
        console.error("Dashboard stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [profile, queryString]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner size="lg" text="Memuat statistik dashboard..." />
      </div>
    );
  }

  const stats = data?.ringkasan || {
    baruHariIni: 0,
    menunggu: 0,
    sedangProses: 0,
    selesaiMinggu: 0,
    darurat: 0,
    total: 0,
  };
  const laporan = data?.preview || [];
  const trendData = data?.trend || [];
  const unreadNotif: any[] = [];

  return (
    <div className="space-y-8">
      <SectionHeading
        label="Ringkasan"
        title={`Selamat datang, ${profile?.name || profile?.position || "Kepala Desa"}`}
        description={`Pantau laporan masyarakat Desa ${profile?.villageName || "Anda"}, tindak lanjut pengaduan, dan kinerja penanganan dari satu dashboard.`}
      />

      <StatsOverview stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentLaporanList laporan={laporan} />
        <div className="space-y-6">
          <LaporanTrendChart data={trendData} />
          <KategoriChart laporan={laporan} />
        </div>
      </div>

      {unreadNotif.length > 0 && (
        <div>
          <SectionHeading
            label="Perhatian"
            title={`${unreadNotif.length} notifikasi belum dibaca`}
          />
          <NotifikasiList notifikasi={unreadNotif} />
        </div>
      )}
    </div>
  );
}
