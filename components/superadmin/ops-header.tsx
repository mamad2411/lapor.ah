"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OpsSidebar } from "./ops-sidebar";
import { toast } from "sonner";

const titles: Record<string, string> = {
  registrations: "Pendaftaran Admin Desa",
  diskusi: "Moderasi Diskusi",
  pesan: "Monitor Pesan Warga",
  admins: "Kelola Admin Desa",
  audit: "Audit Log",
};

export function OpsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const segment = pathname.split("/").pop() || "";
  const title = titles[segment] || "Ringkasan Operasional";

  async function logout() {
    await fetch("/api/ops/v1/auth/logout", { method: "POST" });
    toast.success("Sesi ditutup");
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <OpsSidebar />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <span className="hidden sm:inline text-xs font-mono text-muted-foreground">Operasional Terproteksi</span>
          <h1 className="font-display text-xl lg:text-2xl tracking-tight truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="size-4 hidden dark:block" />
          </Button>
          <Button variant="outline" size="sm" onClick={logout} className="gap-1">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
