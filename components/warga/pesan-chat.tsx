"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, Bot, User, MessageCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";import type { VillageOption, PesanMessage } from "@/lib/warga/types";

interface TrendingItem {
  rank: number;
  text: string;
  count: number;
}

export function PesanChat() {
  const searchParams = useSearchParams();
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [villageId, setVillageId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PesanMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedVillage = villages.find((v) => v.id === villageId);

  // Load daftar desa
  useEffect(() => {
    fetch("/api/villages/list")
      .then((r) => r.json())
      .then((d) => {
        setVillages(d.villages || []);
        const paramId = searchParams.get("villageId");
        if (paramId) {
          setVillageId(paramId);
        }
      });
  }, [searchParams]);

  // Load trending saat desa dipilih
  useEffect(() => {
    if (!villageId) {
      setTrending([]);
      return;
    }
    setTrendingLoading(true);
    fetch(`/api/pesan/trending?villageId=${villageId}`)
      .then((r) => r.json())
      .then((d) => setTrending(d.trending || []))
      .finally(() => setTrendingLoading(false));
  }, [villageId]);

  // Scroll to bottom without affecting window scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text || input;
    if (!msg.trim() || !villageId) return;
    if (!selectedVillage) return;

    setLoading(true);
    setInput("");
    try {
      const res = await fetch("/api/pesan/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId,
          villageName: selectedVillage.villageName,
          sessionId: sessionId || undefined,
          message: msg,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.sessionId);
      setMessages(data.messages);

      fetch(`/api/pesan/trending?villageId=${villageId}`)
        .then((r) => r.json())
        .then((d) => setTrending(d.trending || []));
    } catch {
      setInput(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      {/* ── Area Chat ── */}
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Pesan ke Admin Desa
          </CardTitle>
          <Select
            value={villageId}
            onValueChange={(v) => {
              setVillageId(v);
              setMessages([]);
              setSessionId(null);
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Pilih desa tujuan" />
            </SelectTrigger>
            <SelectContent>
              {villages.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.villageName} — {v.adminName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {!villageId ? (
              <p className="text-center text-muted-foreground text-sm py-12">
                Pilih desa untuk memulai percakapan
              </p>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Bot className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Bot desa siap membantu. Jika pertanyaan belum ada template, pesan
                  diteruskan ke Kepala Desa.
                </p>
              </div>
            ) : (
            messages.map((m, i) => {
                const isUser = m.role === "user";
                const isAdmin = m.role === "admin";
                const isEscalate = m.role === "bot" && !m.templateId;
                return (
                  <div key={i} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? "bg-foreground text-background" : "bg-muted"}`}>
                        {isAdmin ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      isUser ? "bg-foreground text-background rounded-br-md"
                      : isAdmin ? "bg-foreground/10 border border-foreground/20 rounded-bl-md"
                      : isEscalate ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-md dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-100"
                      : "bg-muted rounded-bl-md"
                    }`}>
                      {!isUser && (
                        <p className="text-[9px] font-semibold mb-1 opacity-60">
                          {isAdmin ? `Admin · ${selectedVillage?.villageName}` : isEscalate ? "⏳ Diteruskan ke Admin" : "Bot · Template"}
                        </p>
                      )}
                      <p>{m.content}</p>
                      <p className="text-[9px] opacity-60 mt-1">
                        {new Date(m.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t flex gap-2">
            <Input
              placeholder={villageId ? "Ketik pertanyaan..." : "Pilih desa dulu"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={!villageId || loading}
            />
            <Button
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => sendMessage()}
              disabled={!villageId || loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Sidebar Trending ── */}
      <aside className="space-y-4">
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-medium text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Pertanyaan
              {villageId && selectedVillage && (
                <span className="text-[10px] font-normal text-muted-foreground ml-auto">
                  {selectedVillage.villageName}
                </span>
              )}
            </h3>

            {/* Belum pilih desa */}
            {!villageId && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Pilih desa untuk melihat pertanyaan trending
              </p>
            )}

            {/* Loading */}
            {villageId && trendingLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Kosong tapi sudah pilih desa */}
            {villageId && !trendingLoading && trending.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Belum ada data trending untuk desa ini
              </p>
            )}

            {/* Daftar top 10 trending */}
            {villageId && !trendingLoading && trending.length > 0 && (
              <ol className="space-y-1.5">
                {trending.map((item) => (
                  <li key={item.rank}>
                    <button
                      onClick={() => sendMessage(item.text)}
                      disabled={loading}
                      className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50 group"
                    >
                      {/* Rank badge */}
                      <span
                        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                          item.rank === 1
                            ? "bg-amber-400/20 text-amber-600"
                            : item.rank === 2
                            ? "bg-slate-300/30 text-slate-600"
                            : item.rank === 3
                            ? "bg-orange-300/20 text-orange-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.rank}
                      </span>
                      <span className="flex-1 text-xs leading-snug line-clamp-2">
                        {item.text}
                      </span>
                      {/* Count chip */}
                      <span className="shrink-0 text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 mt-0.5">
                        {item.count}×
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground px-1">
          Notifikasi otomatis dikirim ke email & WhatsApp admin desa untuk pesan yang belum
          ada template.
        </p>
      </aside>
    </div>
  );
}
