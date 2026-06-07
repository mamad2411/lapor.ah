"use client";

import { useState, useEffect, useRef } from "react";
import { BarChart3, Bell, MapPin, Users } from "lucide-react";

const dashboardTabs = [
  {
    label: "Ringkasan",
    stats: [
      { label: "Laporan baru hari ini", value: "23" },
      { label: "Menunggu tindak lanjut", value: "41" },
      { label: "Selesai minggu ini", value: "156" },
    ],
  },
  {
    label: "Per Wilayah",
    stats: [
      { label: "Dusun Krajan Wetan", value: "8 laporan" },
      { label: "Dusun Sumber Rejo", value: "5 laporan" },
      { label: "Dusun Ngemplak", value: "12 laporan" },
    ],
  },
  {
    label: "Notifikasi",
    stats: [
      { label: "Laporan darurat", value: "2" },
      { label: "Tenggat hari ini", value: "7" },
      { label: "Umpan balik warga", value: "14" },
    ],
  },
];

const panelFeatures = [
  {
    icon: BarChart3,
    title: "Dashboard Agregat",
    description: "Pantau volume, kategori, dan SLA penanganan laporan secara real-time.",
  },
  {
    icon: MapPin,
    title: "Peta Laporan",
    description: "Visualisasi titik laporan per dusun untuk prioritas penanganan wilayah.",
  },
  {
    icon: Bell,
    title: "Notifikasi Otomatis",
    description: "Petugas mendapat pemberitahuan saat ada laporan baru atau status berubah.",
  },
  {
    icon: Users,
    title: "Manajemen Peran",
    description: "Atur akses untuk Kepala Desa, Sekdes, RT/RW, dan bidang teknis.",
  },
];

export function AdminPanelSection() {
  const [activeTab, setActiveTab] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="panel-admin" ref={sectionRef} className="relative py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Panel Perangkat Desa
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-display tracking-tight mb-6 lg:mb-8">
              Kelola laporan
              <br />
              <span className="text-muted-foreground">dari satu tempat.</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 lg:mb-12 leading-relaxed">
              Dashboard khusus untuk Kepala Desa, Sekretaris Desa, dan petugas bidang. Tugaskan,
              pantau, dan tutup laporan dengan bukti penyelesaian.
            </p>

            <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
              {panelFeatures.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`p-4 sm:p-0 border sm:border-0 border-foreground/10 rounded-lg transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 50 + 200}ms` }}
                >
                  <feature.icon className="w-5 h-5 mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-2 text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`lg:sticky lg:top-32 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10 rounded-lg overflow-hidden">
              <div className="flex items-center border-b border-foreground/10 overflow-x-auto scrollbar-hide">
                {dashboardTabs.map((tab, idx) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-mono whitespace-nowrap transition-colors relative flex-shrink-0 ${
                      activeTab === idx
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {activeTab === idx && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8 bg-foreground/[0.01] min-h-[220px]">
                <p className="text-xs font-mono text-muted-foreground mb-6">
                  Dashboard Lapor.ah — Perangkat Desa
                </p>
                <div className="space-y-4">
                  {dashboardTabs[activeTab].stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between py-3 sm:py-4 border-b border-foreground/10 last:border-0 gap-4"
                    >
                      <span className="text-muted-foreground text-sm sm:text-base flex-1">{stat.label}</span>
                      <span className="font-display text-xl sm:text-2xl flex-shrink-0">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-foreground/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <span className="text-xs font-mono text-muted-foreground">Sistem berjalan normal</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <a href="/admin" className="text-foreground hover:underline underline-offset-4">
                Masuk sebagai petugas
              </a>
              <span className="text-foreground/20">|</span>
              <a href="#faq" className="text-muted-foreground hover:text-foreground">
                Panduan penggunaan
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
