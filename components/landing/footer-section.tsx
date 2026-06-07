"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const AnimatedWave = dynamic(
  () => import("./animated-wave").then((m) => ({ default: m.AnimatedWave })),
  { ssr: false, loading: () => null }
);

// Mirrors header navLinks + tabLinks exactly
const footerLinks = {
  Platform: [
    { name: "Fitur", href: "/#features" },
    { name: "Cara Kerja", href: "/#how-it-works" },
    { name: "Kategori", href: "/#kategori" },
    { name: "Keamanan", href: "/#security" },
    { name: "FAQ", href: "/#faq" },
  ],
  Laporan: [
    { name: "Buat Laporan", href: "/laporan/buat" },
    { name: "Lacak Laporan", href: "/laporan/lacak" },
  ],
  Komunitas: [
    { name: "Diskusi", href: "/diskusi" },
    { name: "Pesan", href: "/pesan" },
  ],
  Akun: [
    { name: "Masuk", href: "/masuk" },
    { name: "Daftar", href: "/auth/daftar" },
  ],
};

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">
      <div className="absolute inset-0 h-64 opacity-20 pointer-events-none overflow-hidden">
        <AnimatedWave />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            {/* Brand col */}
            <div className="col-span-2">
              <Link href="/" className="inline-flex items-center gap-1 mb-6">
                <span className="text-2xl font-display">
                  Lapor<span className="text-muted-foreground">.ah</span>
                </span>
              </Link>
              <p className="text-muted-foreground leading-relaxed max-w-xs">
                Platform digital pengaduan masyarakat desa. Warga melapor, pemerintah desa
                menindaklanjuti—transparan dan terukur.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lapor.ah. Hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
