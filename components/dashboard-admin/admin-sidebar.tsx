"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "./admin-context";

const navItems = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/laporan", label: "Semua Laporan", icon: FileText },
  { href: "/admin/diskusi", label: "Diskusi", icon: MessagesSquare },
  { href: "/admin/pesan", label: "Pesan Warga", icon: MessageSquare },
  { href: "/admin/wilayah", label: "Per Wilayah", icon: MapPin },
  { href: "/admin/laporan-bulanan", label: "Laporan Bulanan", icon: BarChart3 },
  { href: "/admin/notifikasi", label: "Notifikasi", icon: Bell, badge: true },
  { href: "/admin/profile", label: "Profil Desa", icon: User },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { profile, adminHref } = useAdmin();
  const [unread, setUnread] = useState(0);

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "KD";

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => setUnread((d.notifications || []).filter((n: { read: boolean }) => !n.read).length))
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="flex h-full flex-col border-r border-foreground/10 bg-background">
      <div className="border-b border-foreground/10 px-6 py-5">
        <Link href="/" className="font-display text-2xl tracking-tight" onClick={onNavigate}>
          Lapor<span className="text-muted-foreground">.ah</span>
        </Link>
        <p className="mt-1 text-xs font-mono text-muted-foreground">Panel Kepala Desa</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const href = adminHref(item.href);
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors relative group",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && unread > 0 && (
                <span
                  className={cn(
                    "text-xs font-mono px-1.5 py-0.5 rounded min-w-[1.25rem] text-center",
                    isActive ? "bg-background/20 text-background" : "bg-foreground text-background"
                  )}
                >
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-foreground/10 px-6 py-4">
        <div className="flex items-center gap-3">
          {profile?.profileImage ? (
            <img
              src={profile.profileImage}
              alt={profile.name}
              className="size-9 rounded-full object-cover border border-foreground/15"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 font-display text-sm">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.name || "Kepala Desa"}</p>
            <p className="truncate text-xs font-mono text-muted-foreground">
              {profile?.villageName || "—"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground">Sistem berjalan normal</span>
        </div>
      </div>
    </aside>
  );
}
