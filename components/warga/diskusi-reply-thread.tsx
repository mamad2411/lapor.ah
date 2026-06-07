"use client";

import { useEffect, useState } from "react";
import { Loader2, Reply, Send, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { StickerPicker } from "./sticker-picker";
import { getStickerById } from "@/lib/warga/stickers";
import type { DiskusiReply, StickerItem } from "@/lib/warga/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DiskusiReplyThreadProps {
  postId: string;
  adminRating?: { note: string; ratedBy: string };
  onReplyCountChange?: (count: number) => void;
}

function ReplyItem({
  reply,
  depth,
  onReplyTo,
}: {
  reply: DiskusiReply & { children?: DiskusiReply[] };
  depth: number;
  onReplyTo: (id: string) => void;
}) {
  const sticker = reply.stickerId ? getStickerById(reply.stickerId) : null;
  const hasSticker = sticker || reply.stickerUrl;

  const saveSticker = () => {
    if (!reply.stickerId && !reply.stickerUrl) return;
    
    const saved = localStorage.getItem("my_stickers");
    let list = [];
    if (saved) {
      try { list = JSON.parse(saved); } catch (e) { list = []; }
    }

    const exists = list.find((s: any) => (reply.stickerId && s.id === reply.stickerId) || (reply.stickerUrl && s.url === reply.stickerUrl));
    if (exists) {
      toast.error("Stiker sudah ada di koleksi!");
      return;
    }

    const newSticker = {
      id: reply.stickerId || `saved-${Date.now()}`,
      url: reply.stickerUrl || sticker?.url,
      emoji: sticker?.emoji,
      label: "Stiker Simpanan",
      category: "koleksi",
    };

    list.push(newSticker);
    localStorage.setItem("my_stickers", JSON.stringify(list));
    toast.success("Stiker disimpan ke koleksi!");
  };

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-4 sm:ml-8 border-l-2 border-muted pl-3")}>
      <div className={cn("rounded-lg p-3 space-y-1", reply.isAdmin ? "bg-primary/5 border border-primary/20" : "bg-muted/40")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{reply.isAdmin ? (reply.adminName || "Admin Desa") : reply.authorAlias}</span>
            {reply.isAdmin && (
              <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground rounded-full border-none gap-0.5">
                ✓ Admin Desa
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            r/{reply.id.slice(0, 8)}
          </span>
        </div>
        {hasSticker && (
          <div className="relative group/sticker inline-block my-1">
            <div className="w-20 h-20">
              {reply.stickerUrl || sticker?.url ? (
                <img src={reply.stickerUrl || sticker?.url} alt="Stiker" className="w-full h-full object-contain" />
              ) : (
                <span className="text-4xl block">{sticker?.emoji}</span>
              )}
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow-sm border border-primary/10 bg-background/90"
              onClick={saveSticker}
              title="Simpan Stiker"
            >
              <Star className="w-3 h-3 fill-current" />
            </Button>
          </div>
        )}
        {reply.content && <p className="text-sm whitespace-pre-wrap">{reply.content}</p>}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground">
            {new Date(reply.createdAt).toLocaleString("id-ID")}
          </span>
          <button
            type="button"
            onClick={() => onReplyTo(reply.id)}
            className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
          >
            <Reply className="w-3 h-3" /> Balas
          </button>
        </div>
      </div>
      {reply.children?.map((child) => (
        <ReplyItem key={child.id} reply={child} depth={depth + 1} onReplyTo={onReplyTo} />
      ))}
    </div>
  );
}

function buildReplyTree(replies: DiskusiReply[]) {
  const map = new Map<string, DiskusiReply & { children: DiskusiReply[] }>();
  const roots: (DiskusiReply & { children: DiskusiReply[] })[] = [];

  for (const r of replies) {
    map.set(r.id, { ...r, children: [] });
  }
  for (const r of replies) {
    const node = map.get(r.id)!;
    if (r.parentReplyId && map.has(r.parentReplyId)) {
      map.get(r.parentReplyId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function DiskusiReplyThread({ postId, adminRating, onReplyCountChange }: DiskusiReplyThreadProps) {
  const [replies, setReplies] = useState<DiskusiReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [selectedStickers, setSelectedStickers] = useState<StickerItem[]>([]);
  const [parentReplyId, setParentReplyId] = useState<string | undefined>();

  const loadReplies = () => {
    fetch(`/api/diskusi/posts/${postId}/replies`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.replies || [];
        setReplies(list);
        onReplyCountChange?.(list.length + (adminRating ? 1 : 0));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReplies();
  }, [postId]);

  async function handleSend() {
    if (!content.trim() && selectedStickers.length === 0) {
      toast.error("Tulis balasan atau pilih stiker");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/diskusi/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          parentReplyId, 
          stickers: selectedStickers.map(s => ({ id: s.id, url: s.url }))
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.error)) {
          toast.error(data.error[0]?.message || "Gagal mengirim balasan");
        } else {
          toast.error(data.error || "Gagal mengirim balasan");
        }
        return;
      }

      setContent("");
      setSelectedStickers([]);
      setParentReplyId(undefined);
      loadReplies();
      toast.success("Balasan terkirim!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim");
    } finally {
      setSending(false);
    }
  }

  const tree = buildReplyTree(replies);

  return (
    <div className="space-y-4">
      <div id="reply-form" className="rounded-xl border p-4 space-y-3 bg-card scroll-mt-24">

        <Textarea
          placeholder="Tulis balasan... (tanpa like, cukup diskusi!)"
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {selectedStickers.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in zoom-in-95">
            {selectedStickers.map((sticker, idx) => (
              <div key={`${sticker.id}-${idx}`} className="relative group/sticker-preview inline-block">
                <div className="w-20 h-20 p-2 bg-primary/5 rounded-xl border border-primary/20">
                  {sticker.url ? (
                    <img src={sticker.url} alt="Stiker" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-4xl flex items-center justify-center h-full">{sticker.emoji}</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedStickers(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-white rounded-full opacity-0 group-hover/sticker-preview:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {parentReplyId && (
            <Badge variant="secondary" className="gap-1 h-7">
              Membalas r/{parentReplyId.slice(0, 8)}
              <button onClick={() => setParentReplyId(undefined)}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          <div className="flex-1 flex items-center justify-between">
            <StickerPicker 
              onSelect={(s) => setSelectedStickers(prev => [...prev, s])} 
              size="sm" 
            />
            <Button size="sm" className="ml-auto gap-1 rounded-full" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Kirim
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tree.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          Belum ada balasan. Jadilah yang pertama membalas!
        </p>
      ) : (
        <div className="space-y-3">
          {tree.map((r) => (
            <ReplyItem key={r.id} reply={r} depth={0} onReplyTo={setParentReplyId} />
          ))}
        </div>
      )}
    </div>
  );
}
