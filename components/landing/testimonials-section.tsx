"use client";

import { useEffect, useState } from "react";

// Avatar menggunakan DiceBear "notionists" style — foto-style, deterministik dari nama
function PersonAvatar({ seed }: { seed: string }) {
  const encoded = encodeURIComponent(seed);
  return (
    <img
      src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encoded}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&scale=90`}
      alt={seed}
      className="w-full h-full object-cover"
    />
  );
}

const testimonials = [
  {
    quote:
      "Dulu harus ke kantor desa untuk lapor jalan rusak. Sekarang cukup foto dari HP, dua hari kemudian sudah diperbaiki.",
    author: "Siti Aminah",
    role: "Warga",
    company: "RT 03, Dusun Krajan Wetan",
    metric: "Laporan selesai dalam 2 hari",
  },
  {
    quote:
      "Sebagai Ketua RT, saya bisa memantau laporan warga dan meneruskannya ke desa tanpa bolak-balik WhatsApp.",
    author: "Hendra Wijaya",
    role: "Ketua RT",
    company: "RW 02",
    metric: "Koordinasi 3x lebih efisien",
  },
  {
    quote:
      "Dashboard membantu kami memprioritaskan anggaran desa berdasarkan laporan yang paling banyak dan mendesak.",
    author: "Bapak Joko Susilo",
    role: "Kepala Desa",
    company: "Desa Makmur",
    metric: "Transparansi penanganan 100%",
  },
  {
    quote:
      "Sekdes tidak lagi kehilangan arsip pengaduan. Semua tercatat digital dengan bukti foto dan lokasi.",
    author: "Dewi Lestari",
    role: "Sekretaris Desa",
    company: "Desa Sejahtera",
    metric: "Arsip digital terpusat",
  },
];

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length);
        setIsAnimating(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeTestimonial = testimonials[activeIndex];

  return (
    <section id="testimoni" className="relative py-32 lg:py-40 border-t border-foreground/10 lg:pb-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Cerita dari lapangan
          </span>
          <div className="flex-1 h-px bg-foreground/10" />
          <span className="font-mono text-xs text-muted-foreground">
            {String(activeIndex + 1).padStart(2, "0")} / {String(testimonials.length).padStart(2, "0")}
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-8">
            <blockquote
              className={`transition-all duration-300 ${
                isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              <p className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight text-foreground">
                &ldquo;{activeTestimonial.quote}&rdquo;
              </p>
            </blockquote>

            <div
              className={`mt-12 flex items-center gap-6 transition-all duration-300 delay-100 ${
                isAnimating ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center overflow-hidden shrink-0">
                <PersonAvatar seed={activeTestimonial.author} />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{activeTestimonial.author}</p>
                <p className="text-muted-foreground">
                  {activeTestimonial.role}, {activeTestimonial.company}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-center">
            <div
              className={`p-8 border border-foreground/10 transition-all duration-300 ${
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              }`}
            >
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-4">
                Dampak
              </span>
              <p className="font-display text-3xl md:text-4xl text-foreground">
                {activeTestimonial.metric}
              </p>
            </div>

            <div className="flex gap-2 mt-8">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Testimoni ${idx + 1}`}
                  onClick={() => {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setActiveIndex(idx);
                      setIsAnimating(false);
                    }, 300);
                  }}
                  className={`h-2 transition-all duration-300 ${
                    idx === activeIndex
                      ? "w-8 bg-foreground"
                      : "w-2 bg-foreground/20 hover:bg-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
