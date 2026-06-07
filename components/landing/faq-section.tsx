"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Apakah Lapor.ah gratis untuk warga?",
    answer:
      "Ya. Warga desa dapat membuat akun, mengirim laporan, dan memantau status tanpa biaya. Layanan ini ditujukan untuk mempermudah komunikasi antara masyarakat dan pemerintah desa.",
  },
  {
    question: "Laporan apa saja yang bisa disampaikan?",
    answer:
      "Anda dapat melaporkan masalah infrastruktur (jalan rusak, drainase), kebersihan, penerangan, air bersih, kebisingan, hingga usulan pembangunan. Setiap laporan dikategorikan agar ditangani unit yang tepat.",
  },
  {
    question: "Bagaimana cara melacak laporan saya?",
    answer:
      "Setelah mengirim laporan, Anda mendapat nomor tiket unik. Status diperbarui secara berkala—mulai dari diterima, sedang ditinjau, dalam pengerjaan, hingga selesai—beserta catatan dari perangkat desa.",
  },
  {
    question: "Apakah identitas pelapor bisa dirahasiakan?",
    answer:
      "Untuk laporan sensitif, Anda dapat memilih opsi anonim. Data tetap tersimpan aman di sistem dan hanya diakses petugas berwenang sesuai kebijakan desa.",
  },
  {
    question: "Siapa yang menindaklanjuti laporan?",
    answer:
      "Laporan ditangani oleh perangkat desa, RT/RW, atau bidang terkait sesuai kategori. Kepala desa dapat memantau seluruh laporan melalui dashboard agregat.",
  },
  {
    question: "Apakah bisa digunakan di HP?",
    answer:
      "Lapor.ah dirancang mobile-first. Anda dapat melaporkan langsung dari ponsel dengan foto, lokasi GPS, dan deskripsi singkat—kapan saja tanpa harus ke kantor desa.",
  },
];

function FaqItem({
  item,
  isOpen,
  onToggle,
}: {
  item: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-foreground/10 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-6 text-left group"
      >
        <span className="text-lg lg:text-xl font-medium group-hover:translate-x-1 transition-transform duration-300">
          {item.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${
          isOpen ? "grid-rows-[1fr] opacity-100 pb-6" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-muted-foreground leading-relaxed pr-8">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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
    <section id="faq" ref={sectionRef} className="relative py-24 lg:py-32 border-t border-foreground/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              FAQ
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-6">
              Pertanyaan
              <br />
              <span className="text-muted-foreground">yang sering diajukan.</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Belum menemukan jawaban? Hubungi kantor desa atau tim dukungan Lapor.ah.
            </p>
          </div>

          <div
            className={`transition-all duration-700 delay-150 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {faqs.map((item, index) => (
              <FaqItem
                key={item.question}
                item={item}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
