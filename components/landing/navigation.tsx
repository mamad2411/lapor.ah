"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Sun, Moon, Hash, Flame, TrendingUp, ChevronDown, FilePlus, Search } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import type { TrendingHashtag } from "@/lib/warga/types";
import { useHashScroll } from "@/lib/use-hash-scroll";

const navLinks = [
  { name: "Fitur", href: "/#features" },
  { name: "Cara Kerja", href: "/#how-it-works" },
  { name: "Kategori", href: "/#kategori" },
  { name: "Keamanan", href: "/#security" },
  { name: "FAQ", href: "/#faq" },
];

const tabLinks = [
  { name: "Diskusi", href: "/diskusi", trending: true },
  { name: "Pesan", href: "/pesan" },
];

const TAGLINE: Record<string, string> = {
  hot: "Hot",
  popular_minggu: "Populer Minggu Ini",
  popular_bulan: "Populer Bulan Ini",
  popular_akhir: "Populer Akhir-akhir Ini",
};

function LaporanNavLink() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    // pakai pointerup bukan mousedown — lebih reliable di touch & desktop
    document.addEventListener("pointerup", handleOutside);
    return () => document.removeEventListener("pointerup", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Tap target lebih besar — padding vertikal cukup buat mudah diklik */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-2 -mx-2 text-sm text-foreground/70 hover:text-foreground transition-colors duration-200 whitespace-nowrap select-none"
        aria-expanded={open}
        aria-haspopup="true"
        suppressHydrationWarning
      >
        Laporan
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Bridge invisible agar cursor tidak "keluar" saat gerak ke dropdown */}
      {open && <div className="absolute top-full left-0 w-full h-2" />}

      {/* Dropdown — lebih lebar, padding lebih besar, mudah diklik */}
      <div
        className={`absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-52 rounded-2xl border bg-background shadow-xl z-[300] transition-all duration-150 origin-top ${
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="p-1.5">
          <Link
            href="/laporan/buat"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
          >
            <FilePlus className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Buat Laporan</span>
          </Link>
          <Link
            href="/laporan/lacak"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
          >
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Lacak Laporan</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DiskusiNavLink() {
  const [open, setOpen] = useState(false);
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && trending.length === 0) {
      fetch("/api/diskusi/trending")
        .then((r) => r.json())
        .then((d) => setTrending(d.trending || []));
    }
  }, [open, trending.length]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/diskusi"
        className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group whitespace-nowrap"
      >
        Diskusi
        <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
      </Link>
      {open && trending.length > 0 && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 rounded-xl border bg-background/95 backdrop-blur-xl shadow-lg p-3 z-[300]">
          <p className="text-[10px] font-mono uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Trending Hashtag
          </p>
          <ul className="space-y-1">
            {trending.slice(0, 6).map((t) => (
              <li key={t.tag}>
                <Link
                  href={`/diskusi?tag=${t.tag}`}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    {t.tag}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {t.tagline === "hot" && <Flame className="w-3 h-3 text-orange-500" />}
                    {TAGLINE[t.tagline] || t.tagline}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Pill-shaped theme toggle — fires on pointerdown for instant feel */
function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // prevent double-fire when both pointerdown + click fire on desktop
  const didToggle = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className={`w-[4.25rem] h-8 rounded-full bg-foreground/10 ${className}`} />;
  }

  const isDark = theme === "dark";

  const toggle = () => {
    if (didToggle.current) { didToggle.current = false; return; }
    didToggle.current = true;
    setTheme(isDark ? "light" : "dark");
    // reset flag after a tick so next interaction works
    setTimeout(() => { didToggle.current = false; }, 300);
  };

  return (
      <button
        onPointerDown={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        suppressHydrationWarning
        className={`relative flex items-center w-[4.25rem] h-8 rounded-full border border-foreground/20 bg-foreground/10 active:scale-95 transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 touch-manipulation select-none ${className}`}
      >
      {/* Track tint */}
      <span
        className={`absolute inset-0 rounded-full transition-colors duration-200 ${
          isDark ? "bg-foreground/5" : "bg-foreground/5"
        }`}
      />
      {/* Sliding knob */}
      <span
        className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-foreground shadow transition-all duration-200 ease-out ${
          isDark ? "translate-x-[2px]" : "translate-x-[36px]"
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-background" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-background" />
        )}
      </span>
      {/* Background icon (opposite) */}
      <span
        className={`absolute z-0 transition-opacity duration-150 ${
          isDark ? "right-2 opacity-35" : "left-2 opacity-35"
        }`}
      >
        {isDark ? (
          <Sun className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-foreground" />
        )}
      </span>
    </button>
  );
}

/** Accordion Laporan untuk mobile menu */
function MobileLaporanAccordion({
  closeMenu,
  delay,
  visible,
}: {
  closeMenu: () => void;
  delay: string;
  visible: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Reset saat menu ditutup
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  return (
    <div
      className={`transition-[opacity,transform] duration-150 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{ transitionDelay: delay }}
    >
      {/* Header accordion */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-2.5 text-[1.75rem] sm:text-[2rem] leading-tight font-display text-foreground active:text-muted-foreground touch-manipulation select-none"
      >
        Laporan
        <ChevronDown
          className={`w-6 h-6 text-foreground/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Sub-items — slide open */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pl-4 pb-2 flex flex-col gap-0.5 border-l-2 border-foreground/10 ml-1">
          <Link
            href="/laporan/buat"
            onClick={closeMenu}
            className="flex items-center gap-3 py-4 text-lg font-display text-foreground/70 active:text-foreground touch-manipulation w-full"
          >
            <FilePlus className="w-5 h-5 text-muted-foreground shrink-0" />
            Buat Laporan
          </Link>
          <Link
            href="/laporan/lacak"
            onClick={closeMenu}
            className="flex items-center gap-3 py-4 text-lg font-display text-foreground/70 active:text-foreground touch-manipulation w-full"
          >
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            Lacak Laporan
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useHashScroll();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 20);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  // fire on pointerdown so hamburger feels instant
  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen((open) => !open);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <>
      {/* Header bar — always on top */}
      <header
        className={`fixed inset-x-0 z-[200] transition-all duration-500 ${
          isScrolled ? "top-4 px-4" : "top-0"
        }`}
      >
        <nav
          className={`mx-auto transition-all duration-500 ${
            isScrolled || isMobileMenuOpen
              ? "bg-background/90 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
              : "bg-transparent max-w-[1400px] px-4"
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-500 ${
              isScrolled ? "h-16 px-6 lg:px-10" : "h-20 px-4 lg:px-10"
            }`}
          >
            {/* Logo */}
            <a href="/" className="flex items-center gap-1 shrink-0">
              <span
                className={`font-display tracking-tight transition-all duration-500 ${
                  isScrolled ? "text-2xl" : "text-3xl"
                }`}
              >
                Lapor<span className="text-muted-foreground">.ah</span>
              </span>
            </a>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8 lg:gap-10">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group whitespace-nowrap"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
                </a>
              ))}

              {/* Separator */}
              <span className="h-4 w-px bg-foreground/20 shrink-0" />

              {/* Tab links */}
              <LaporanNavLink />
              {tabLinks.map((link) =>
                link.trending ? (
                  <DiskusiNavLink key={link.name} />
                ) : (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group whitespace-nowrap"
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
                  </Link>
                )
              )}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4 shrink-0">
              <ThemeToggle />
              <a
                href="/masuk"
                className={`text-foreground/70 hover:text-foreground transition-all duration-500 whitespace-nowrap ${
                  isScrolled ? "text-sm" : "text-base"
                }`}
              >
                Masuk
              </a>
              <Button
                className={`bg-foreground hover:bg-foreground/90 text-background rounded-full transition-all duration-500 whitespace-nowrap ${
                  isScrolled ? "px-5 h-9 text-sm" : "px-7 h-10 text-base"
                }`}
                asChild
              >
                <a href="/laporan/buat">Buat Laporan</a>
              </Button>
            </div>

            {/* Hamburger + theme toggle — mobile */}
            <div className="flex items-center gap-3 lg:hidden">
              <ThemeToggle />

              {/* Hamburger — large tap target, fires on pointerdown */}
              <button
                type="button"
                onPointerDown={toggleMenu}
                className="flex items-center justify-center w-14 h-14 -mr-3 rounded-2xl text-foreground active:bg-foreground/10 active:scale-95 transition-transform duration-100 touch-manipulation select-none"
                aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={isMobileMenuOpen}
              >
                {/* Animated icon swap */}
                <span className="relative w-7 h-7 flex items-center justify-center">
                  <Menu
                    className={`absolute w-7 h-7 transition-all duration-150 ${
                      isMobileMenuOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                    }`}
                    strokeWidth={2}
                  />
                  <X
                    className={`absolute w-7 h-7 transition-all duration-150 ${
                      isMobileMenuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
                    }`}
                    strokeWidth={2}
                  />
                </span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile menu — slides down from top, instant open */}
      <div
        className={`lg:hidden fixed inset-0 z-[150] bg-background transition-[transform,opacity] duration-200 ease-out ${
          isMobileMenuOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-3 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        {/* Spacer matching header height */}
        <div className="h-20" />

        <div className="flex flex-col h-[calc(100%-5rem)] px-6 pb-8 overflow-y-auto">
          <nav className="flex-1 flex flex-col justify-center gap-1">

            {/* Nav links utama */}
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                onClick={closeMenu}
                className={`text-[2rem] sm:text-[2.5rem] leading-tight font-display text-foreground active:text-muted-foreground py-4 transition-[opacity,transform] duration-150 ease-out break-words w-full ${
                  isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 30}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}

            {/* Separator */}
            <div className="border-t border-foreground/10 my-3" />

            {/* Laporan — accordion di mobile */}
            <MobileLaporanAccordion
              closeMenu={closeMenu}
              delay={isMobileMenuOpen ? `${navLinks.length * 30}ms` : "0ms"}
              visible={isMobileMenuOpen}
            />

            {/* Diskusi & Pesan */}
            {tabLinks.map((link, i) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenu}
                className={`text-[2rem] leading-tight font-display text-foreground/80 active:text-muted-foreground py-4 transition-[opacity,transform] duration-150 ease-out w-full ${
                  isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${(navLinks.length + 1 + i) * 30}ms` : "0ms" }}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div
            className={`flex gap-3 pt-6 border-t border-foreground/10 transition-[opacity,transform] duration-150 ease-out ${
              isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: isMobileMenuOpen ? "160ms" : "0ms" }}
          >
            <Button variant="outline" className="flex-1 rounded-full h-12 text-sm touch-manipulation" asChild>
              <a href="/masuk" onClick={closeMenu}>
                Masuk
              </a>
            </Button>
            <Button className="flex-1 bg-foreground text-background rounded-full h-12 text-sm touch-manipulation" asChild>
              <a href="/laporan/buat" onClick={closeMenu}>
                Buat Laporan
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
