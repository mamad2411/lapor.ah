"use client";

import { useEffect, useState, useRef } from "react";

const kategori = [
  { name: "Jalan & Drainase", category: "Infrastruktur" },
  { name: "Sampah & Kebersihan", category: "Lingkungan" },
  { name: "Air Bersih", category: "Sumber Daya" },
  { name: "Penerangan Jalan", category: "Infrastruktur" },
  { name: "Kebisingan", category: "Ketertiban" },
  { name: "Banjir & Genangan", category: "Bencana" },
  { name: "Fasilitas Umum", category: "Sosial" },
  { name: "Pelayanan Desa", category: "Administrasi" },
  { name: "Keamanan Lingkungan", category: "Ketertiban" },
  { name: "Pembangunan", category: "Usulan" },
  { name: "Kesehatan Masyarakat", category: "Kesehatan" },
  { name: "Lainnya", category: "Umum" },
];

export function IntegrationsSection() {
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
    <section id="kategori" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`text-center max-w-3xl mx-auto mb-16 lg:mb-24 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Kategori Laporan
            <span className="w-8 h-px bg-foreground/30" />
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-6">
            Laporkan apa pun
            <br />
            yang mengganggu warga.
          </h2>
          <p className="text-xl text-muted-foreground">
            Pilih kategori agar laporan langsung diteruskan ke bidang atau petugas yang tepat di
            pemerintah desa.
          </p>
        </div>
      </div>

      <div className="w-full mb-6">
        <div className="flex gap-6 marquee">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {kategori.map((item) => (
                <div
                  key={`${item.name}-${setIndex}`}
                  className="shrink-0 px-8 py-6 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] transition-all duration-300 group"
                >
                  <div className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                    {item.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.category}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-6 marquee-reverse">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {[...kategori].reverse().map((item) => (
                <div
                  key={`${item.name}-reverse-${setIndex}`}
                  className="shrink-0 px-8 py-6 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] transition-all duration-300 group"
                >
                  <div className="text-lg font-medium group-hover:translate-x-1 transition-transform">
                    {item.name}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.category}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
