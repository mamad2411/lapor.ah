"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "./admin-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, User, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "bot" | "admin"; content: string; at: string; templateId?: string };
type Thread = { id: string; status: string; messages: Msg[]; updatedAt: string };

const STATUS_LABEL: Record<string, string> = {
  bot: "Dijawab Bot",
  waiting_admin: "Menunggu Admin",
  admin_replied: "Sudah Dibalas",
};

export function AdminPesanInbox() {
  const searchParams = useSearchParams();
  const villageId = searchParams.get("id") || "";
  const { profile } = useAdmin();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function load() {
    if (!villageId) return;
    setLoading(true);
    fetch(`/api/admin/pesan?villageId=${villageId}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Thread[] = d.threads || [];
        setThreads(list);
        // Refresh selected jika ada
        if (selected) {
          const updated = list.find((t) => t.id === selected.id);
          if (updated) setSelected(updated);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [villageId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selected?.messages.length]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/pesan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selected.id, message: reply.trim(), adminName: profile?.name || "Admin Desa" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReply("");
      toast.success("Balasan terkirim");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setSending(false);
    }
  }

  const waitingCount = threads.filter((t) => t.status === "waiting_admin").length;

  if (!villageId) return null;

  return (
    <div className="border border-foreground/10 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-foreground/10 flex items-center gap-3">
        <MessageCircle className="w-4 h-4" />
        <p className="text-xs font-mono text-muted-foreground">Inbox Pesan Warga</p>
        {waitingCount > 0 && (
          <Badge className="ml-auto bg-foreground text-background text-[10px]">
            {waitingCount} perlu dibalas
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : threads.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-10">Belum ada pesan masuk</p>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr]">
          {/* List thread */}
          <div className="border-r border-foreground/10 divide-y divide-foreground/10 max-h-[480px] overflow-y-auto">
            {threads.map((t) => {
              const lastMsg = t.messages[t.messages.length - 1];
              const isActive = selected?.id === t.id;
              return (
                <button key={t.id} onClick={() => setSelected(t)}
                  className={cn("w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
                    isActive && "bg-muted/50",
                    t.status === "waiting_admin" && "border-l-2 border-foreground"
                  )}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{t.id.slice(0, 12)}…</span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full",
                      t.status === "waiting_admin" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                    )}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{lastMsg.content}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chat detail */}
          <div className="flex flex-col max-h-[480px]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Pilih percakapan
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selected.messages.map((m, i) => {
                    const isUser = m.role === "user";
                    const isAdmin = m.role === "admin";
                    const isEscalate = m.role === "bot" && !m.templateId;
                    return (
                      <div key={i} className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
                        {!isUser && (
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]",
                            isAdmin ? "bg-foreground text-background" : "bg-muted"
                          )}>
                            {isAdmin ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                          </div>
                        )}
                        <div className={cn("max-w-[75%] rounded-xl px-3 py-2 text-sm",
                          isUser ? "bg-foreground text-background rounded-br-sm"
                          : isAdmin ? "bg-foreground/10 border border-foreground/15 rounded-bl-sm"
                          : isEscalate ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm dark:bg-amber-900/20 dark:text-amber-100"
                          : "bg-muted rounded-bl-sm"
                        )}>
                          {!isUser && <p className="text-[9px] opacity-50 mb-0.5">{isAdmin ? "Admin" : isEscalate ? "⏳ Sistem" : "Bot"}</p>}
                          <p className="leading-relaxed">{m.content}</p>
                          <p className="text-[9px] opacity-50 mt-1">
                            {new Date(m.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleReply} className="border-t border-foreground/10 p-3 flex gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Balas sebagai admin desa..."
                    rows={2}
                    className="resize-none border-foreground/10 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(e as any); } }}
                  />
                  <Button type="submit" size="icon" disabled={sending || !reply.trim()} className="self-end shrink-0">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
