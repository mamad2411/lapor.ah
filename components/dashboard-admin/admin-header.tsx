"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./admin-sidebar";
import { useAdmin } from "./admin-context";

const pageTitles: Record<string, string> = {
  "/admin": "Ringkasan",
  "/admin/laporan": "Semua Laporan",
  "/admin/wilayah": "Per Wilayah",
  "/admin/laporan-bulanan": "Laporan Bulanan",
  "/admin/notifikasi": "Notifikasi",
  "/admin/pengaturan": "Pengaturan",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/laporan/")) return "Detail Laporan";
  return pageTitles[pathname] ?? "Panel Admin";
}

interface AdminHeaderProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export function AdminHeader({
  searchQuery = "",
  onSearchChange,
  showSearch = false,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { adminHref } = useAdmin();
  const [unread, setUnread] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => setUnread((d.notifications || []).filter((n: { read: boolean }) => !n.read).length))
      .catch(() => {});
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
              <Menu className="size-5" />
              <span className="sr-only">Buka menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <AdminSidebar onNavigate={() => {}} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <span className="hidden sm:inline-flex items-center gap-3 text-xs font-mono text-muted-foreground mb-0.5">
            <span className="w-6 h-px bg-foreground/30" />
            Panel Perangkat Desa
          </span>
          <h1 className="font-display text-xl lg:text-2xl tracking-tight truncate">{title}</h1>
        </div>

        {showSearch && onSearchChange && (
          <div className="hidden md:flex relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari laporan..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 border-foreground/10 bg-foreground/[0.02]"
            />
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle tema"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href={adminHref("/admin/notifikasi")}>
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
              )}
              <span className="sr-only">Notifikasi</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
