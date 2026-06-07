"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "I",
    title: "Daftar atau masuk sebagai warga",
    description:
      "Buat akun dengan NIK dan data dasar. Proses singkat agar setiap laporan terhubung ke identitas yang valid.",
    code: `// Form pendaftaran warga
{
  "nama": "Budi Santoso",
  "dusun": "Krajan Wetan",
  "rt": "03", "rw": "02",
  "telepon": "08xxxxxxxxxx"
}`,
  },
  {
    number: "II",
    title: "Kirim laporan dengan bukti",
    description:
      "Pilih kategori, tulis kronologi, unggah foto, dan tandai lokasi. Opsional: laporan anonim untuk kasus sensitif.",
    code: `// Contoh laporan
{
  "kategori": "Jalan & Drainase",
  "judul": "Jalan berlubang di gang 5",
  "lokasi": { "lat": -7.25, "lng": 112.75 },
  "lampiran": ["foto-001.jpg"]
}`,
  },
  {
    number: "III",
    title: "Pantau hingga selesai",
    description:
      "Terima notifikasi setiap perubahan status. Perangkat desa dapat menambahkan catatan dan bukti penyelesaian.",
    code: `// Status laporan #LAP-2026-0847
"Diterima"     → 03 Jun 09:12
"Ditinjau"     → 03 Jun 11:40
"Pengerjaan"   → 04 Jun 08:00
"Selesai"      → 05 Jun 16:30`,
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-background text-foreground overflow-hidden border-y border-border"
    >
      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        <div className="mb-12 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Cara Kerja
          </span>
          <h2
            className={`text-3xl sm:text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Tiga langkah sederhana.
            <br />
            <span className="text-muted-foreground">Dampak nyata untuk desa.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-24">
          {/* Steps list */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left py-6 lg:py-8 border-b border-border transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-4 lg:gap-6">
                  <span className="font-display text-2xl lg:text-3xl text-muted-foreground/30 shrink-0">{step.number}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl lg:text-2xl xl:text-3xl font-display mb-2 lg:mb-3 group-hover:translate-x-1 lg:group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">{step.description}</p>

                    {activeStep === index && (
                      <div className="mt-3 lg:mt-4 h-px bg-muted overflow-hidden">
                        <div
                          className="h-full bg-foreground w-0"
                          style={{ animation: "progress 5s linear forwards" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Code preview */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-border bg-card overflow-hidden rounded-xl shadow-sm">
              <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-foreground/10" />
                  <div className="w-3 h-3 rounded-full bg-foreground/10" />
                  <div className="w-3 h-3 rounded-full bg-foreground/10" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">contoh-laporan.json</span>
              </div>

              <div className="p-4 lg:p-8 font-mono text-xs sm:text-sm min-h-[220px] lg:min-h-[280px] overflow-x-auto">
                <pre className="text-foreground/70">
                  {steps[activeStep].code.split("\n").map((line, lineIndex) => (
                    <div
                      key={`${activeStep}-${lineIndex}`}
                      className="leading-loose code-line-reveal"
                      style={{ animationDelay: `${lineIndex * 80}ms` }}
                    >
                      <span className="text-foreground/20 select-none w-6 lg:w-8 inline-block text-right mr-3">
                        {lineIndex + 1}
                      </span>
                      <span className="code-line-text">{line}</span>
                    </div>
                  ))}
                </pre>
              </div>

              <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-border flex items-center gap-3 bg-muted/30">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground">Siap dikirim</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .code-line-reveal {
          opacity: 0;
          transform: translateX(-8px);
          animation: lineReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes lineReveal {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .code-line-text {
          opacity: 0;
          transform: translateX(-4px);
          animation: lineReveal 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </section>
  );
}
