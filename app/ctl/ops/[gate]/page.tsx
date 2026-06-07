"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, MessagesSquare, MessageSquare, Users, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useOps, opsPath } from "@/components/superadmin/ops-context";
import { LaporanTrendChart } from "@/components/dashboard-admin/laporan-trend-chart";

export default function OpsDashboardPage() {
  const { gate } = useOps();
  const [stats, setStats] = useState({
    pendingRegistrations: 0,
    diskusiPosts: 0,
    pesanThreads: 0,
    activeAdmins: 0,
  });
  const [trendData, setTrendData] = useState<{ bulan: string; diskusi: number; pesan: number }[]>([]);

  useEffect(() => {
    fetch("/api/ops/v1/auth/verify")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setStats(d.stats);
        if (d.trendData) setTrendData(d.trendData);
      });
  }, []);

  const cards = [
    { label: "Pendaftaran Menunggu", value: stats.pendingRegistrations, icon: UserCheck, href: opsPath(gate, "registrations") },
    { label: "Posting Diskusi Aktif", value: stats.diskusiPosts, icon: MessagesSquare, href: opsPath(gate, "diskusi") },
    { label: "Thread Pesan", value: stats.pesanThreads, icon: MessageSquare, href: opsPath(gate, "pesan") },
    { label: "Admin Desa Aktif", value: stats.activeAdmins, icon: Users, href: opsPath(gate, "admins") },
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        label="Operasional"
        title="Ringkasan Sistem"
        description="Pantau seluruh aktivitas platform — moderasi diskusi, persetujuan admin desa, dan komunikasi warga."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.label} href={c.href}>
                  <Card className="hover:shadow-md transition-shadow h-full border-foreground/10 bg-foreground/[0.01]">
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <span className="text-2xl font-display">{c.value}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card className="border-foreground/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Tren Aktivitas Platform</h3>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] opacity-70">Live Data</Badge>
              </div>
              <LaporanTrendChart data={trendData.map((t) => ({ bulan: t.bulan, masuk: t.diskusi, selesai: t.pesan }))} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-foreground/10 overflow-hidden">
            <div className="h-2 bg-foreground/10" />
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Ringkasan Operasional</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sistem saat ini melayani pendaftaran dari berbagai desa. Pastikan untuk meninjau log audit secara berkala untuk menjaga integritas data.
              </p>
              <div className="mt-6 pt-6 border-t border-foreground/5">
                <Link 
                  href={opsPath(gate, "audit")}
                  className="text-xs font-medium text-foreground/60 hover:text-foreground transition-colors flex items-center justify-between"
                >
                  Lihat Audit Log
                  <span>&rarr;</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
