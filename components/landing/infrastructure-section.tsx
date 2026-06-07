"use client";

import { useEffect, useState, useRef } from "react";

const wilayah = [
  { nama: "Desa Krajan Wetan", wilayah: "RT 01–04", status: "Aktif" },
  { nama: "Desa Krajan Kulon", wilayah: "RT 05–08", status: "Aktif" },
  { nama: "Desa Sumber Rejo", wilayah: "RT 09–12", status: "Aktif" },
  { nama: "Desa Ngemplak", wilayah: "RT 13–16", status: "Aktif" },
  { nama: "Desa Plosokerep", wilayah: "RT 17–20", status: "Aktif" },
  { nama: "Desa Bandulan", wilayah: "RT 21–24", status: "Aktif" },
];

export function InfrastructureSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeLocation, setActiveLocation] = useState(0);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLocation((prev) => (prev + 1) % wilayah.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Jangkauan Wilayah
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Satu desa,
              <br />
              seluruh wilayah terhubung.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              Lapor.ah memetakan setiap RT/RW dan desa agar laporan langsung sampai ke petugas
              yang bertanggung jawab di wilayah tersebut.
            </p>

            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">6</div>
                <div className="text-sm text-muted-foreground">Desa terdaftar</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">24</div>
                <div className="text-sm text-muted-foreground">Rukun Tetangga</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">100%</div>
                <div className="text-sm text-muted-foreground">Cakupan warga</div>
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10">
              <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">Peta Wilayah Desa</span>
                <span className="flex items-center gap-2 text-xs font-mono text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Semua wilayah aktif
                </span>
              </div>

              <div>
                {wilayah.map((item, index) => (
                  <div
                    key={item.nama}
                    className={`px-6 py-5 border-b border-foreground/5 last:border-b-0 flex items-center justify-between transition-all duration-300 ${
                      activeLocation === index ? "bg-foreground/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          activeLocation === index ? "bg-foreground" : "bg-foreground/20"
                        }`}
                      />
                      <div>
                        <div className="font-medium">{item.nama}</div>
                        <div className="text-sm text-muted-foreground">{item.wilayah}</div>
                      </div>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
