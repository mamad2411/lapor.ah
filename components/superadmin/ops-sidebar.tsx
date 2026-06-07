"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  MessagesSquare,
  MessageSquare,
  Users,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps, opsPath } from "./ops-context";

export function OpsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { gate, name, email } = useOps();

  const navItems = [
    { href: opsPath(gate), label: "Ringkasan", icon: LayoutDashboard, exact: true },
    { href: opsPath(gate, "registrations"), label: "Pendaftaran", icon: UserCheck },
    { href: opsPath(gate, "diskusi"), label: "Moderasi Diskusi", icon: MessagesSquare },
    { href: opsPath(gate, "pesan"), label: "Monitor Pesan", icon: MessageSquare },
    { href: opsPath(gate, "admins"), label: "Kelola Admin", icon: Users },
    { href: opsPath(gate, "audit"), label: "Audit Log", icon: ScrollText },
  ];

  return (
    <aside className="flex h-full flex-col border-r border-foreground/10 bg-background">
      <div className="border-b border-foreground/10 px-6 py-5">
        <Link href="/" className="font-display text-2xl tracking-tight block">
          Lapor<span className="text-muted-foreground">.ah</span>
        </Link>
        <p className="mt-1 text-xs font-mono text-muted-foreground">Panel Operasional</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-foreground/10 px-6 py-4">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs font-mono text-muted-foreground truncate">{email}</p>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 truncate">gate/{gate.slice(0, 8)}…</p>
      </div>
    </aside>
  );
}
