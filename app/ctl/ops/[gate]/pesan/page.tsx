"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Bot, User, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "bot" | "admin";
  content: string;
  at: string;
  templateId?: string;
};

type Thread = {
  id: string;
  villageId: string;
  villageName: string;
  status: string;
  messageCount: number;
  lastMessage: string;
  lastRole: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

const roleIcon: Record<string, typeof User> = {
  user: User,
  bot: Bot,
  admin: Headphones,
};

export default function OpsPesanPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/ops/v1/pesan?${params}`)
      .then((r) => r.json())
      .then((d) => setThreads(d.threads || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = threads.filter(
    (t) =>
      !search ||
      t.villageName.toLowerCase().includes(search.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" text="Memuat daftar pesan..." /></div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Monitor"
        title="Semua Pesan Warga"
        description="Lihat seluruh percakapan pesan dari semua desa — termasuk balasan bot dan antrian admin."
      />

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Cari desa atau isi pesan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="bot">Bot aktif</SelectItem>
            <SelectItem value="waiting_admin">Menunggu admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 min-h-[480px]">
        <div className="rounded-xl border divide-y max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Tidak ada thread</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={cn(
                  "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                  selected?.id === t.id && "bg-muted"
                )}
              >
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{t.villageName}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{t.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.lastMessage}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t.messageCount} pesan · {new Date(t.updatedAt).toLocaleString("id-ID")}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-xl border p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground text-center py-16">Pilih thread untuk melihat percakapan</p>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto">
              <div className="border-b pb-3">
                <p className="font-medium">{selected.villageName}</p>
                <p className="text-[10px] font-mono text-muted-foreground">thread/{selected.id.slice(0, 10)}</p>
              </div>
              {selected.messages.map((m, i) => {
                const Icon = roleIcon[m.role] || User;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg p-3 text-sm",
                      m.role === "user" ? "bg-muted/60" : m.role === "bot" ? "bg-primary/5" : "bg-amber-50 dark:bg-amber-950/20"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                      <Icon className="w-3 h-3" />
                      {m.role} · {new Date(m.at).toLocaleString("id-ID")}
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
