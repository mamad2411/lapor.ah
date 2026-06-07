"use client";

import { MessageCircle, Music, MapPin, Share2, Mic, Play, Pause, Copy, Send, Reply, Mail, ArrowLeftRight, Loader2, X, Maximize2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useRef, useEffect } from "react";
import { getStickerById } from "@/lib/warga/stickers";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#0088cc]">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#E4405F]">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.412.558.217.957.477 1.377.896.419.42.679.819.896 1.377.163.422.358 1.057.412 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.412 2.227-.217.558-.477.957-.896 1.377-.42.419-.819.679-1.377.896-.422.163-1.057.358-2.227.412-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.412-.558-.217-.957-.477-1.377-.896-.419-.42-.679-.819-.896-1.377-.163-.422-.358-1.057-.412-2.227C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.249-1.805.412-2.227.217-.558.477-.957.896-1.377.42-.419.819-.679 1.377-.896.422-.163 1.057-.358 2.227-.412 1.266-.058 1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126s1.337 1.079 2.126 1.384c.766.296 1.636.499 2.913.558C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384s1.079-1.338 1.384-2.126c.296-.765.499-1.636.558-2.913.058-1.28.072-1.687.072-4.947s-.014-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126s-1.338-1.079-2.126-1.384c-.765-.296-1.636-.499-2.913-.558C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiskusiPost } from "@/lib/warga/types";
import { DiskusiPollView } from "./diskusi-poll";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ParsedSlot {
  label: string;
  type: "local" | "post";
  value?: string;
  postId?: string;
  isRaw?: boolean;
  stickerId?: string;
  stickerUrl?: string;
}

interface ComparativeData {
  slots: ParsedSlot[];
  conclusion: string;
}

function parseComparativeContent(content: string): ComparativeData | null {
  if (!content) return null;
  const lines = content.split("\n");
  const firstLine = lines[0] || "";
  
  if (!firstLine.startsWith("🔍 Analisis Komparatif:")) {
    return null;
  }
  
  const slotsStr = firstLine.substring("🔍 Analisis Komparatif:".length).trim();
  const rawSlots = slotsStr.split(/\s+[vV][sS]\s+/);
  
  const parsedSlots: ParsedSlot[] = rawSlots.map((raw, index) => {
    const match = raw.match(/^\[([A-Z]):\s*(.+)\]$/);
    if (!match) {
      return {
        label: String.fromCharCode(65 + index),
        type: "local",
        value: raw,
        isRaw: true
      };
    }
    
    const label = match[1];
    let val = match[2].trim();

    let stickerId: string | undefined;
    let stickerUrl: string | undefined;

    // Extract sticker info {s:ID} or {u:URL}
    const stickerMatch = val.match(/\s+\{(s|u):(.+)\}\s*$/);
    if (stickerMatch) {
      if (stickerMatch[1] === "s") stickerId = stickerMatch[2];
      else stickerUrl = stickerMatch[2];
      val = val.replace(/\s+\{(s|u):(.+)\}\s*$/, "").trim();
    }
    
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
      return {
        label,
        type: "local",
        value: val,
        stickerId,
        stickerUrl
      };
    }
    
    if (val.startsWith("Post#")) {
      const postId = val.substring(5).trim();
      return {
        label,
        type: "post",
        postId,
        stickerId,
        stickerUrl
      };
    }
    
    return {
      label,
      type: "local",
      value: val,
      stickerId,
      stickerUrl
    };
  });
  
  const conclusion = lines.slice(1).join("\n").trim();
  
  return {
    slots: parsedSlots,
    conclusion
  };
}

interface DiskusiPostCardProps {
  post: DiskusiPost;
  onTagClick?: (tag: string) => void;
  variant?: "feed" | "thread";
}

export function DiskusiPostCard({ post, onTagClick, variant = "feed" }: DiskusiPostCardProps) {
  const router = useRouter();
  const isFeed = variant === "feed";
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [fetchedPosts, setFetchedPosts] = useState<Record<string, DiskusiPost>>({});
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  const [previewMedia, setPreviewMedia] = useState<{ type: string; url: string } | null>(null);

  const [villages, setVillages] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/villages/list")
      .then(r => r.json())
      .then(d => setVillages(d.villages || []))
      .catch(() => {});
  }, []);

  const renderParsedContent = (content: string) => {
    if (!content) return null;
    if (villages.length === 0) return content;

    const sortedVillages = [...villages].sort((a, b) => b.villageName.length - a.villageName.length);
    let elements: React.ReactNode[] = [content];
    
    sortedVillages.forEach((v) => {
      const mentionText = `@${v.villageName}`;
      const escapedMention = mentionText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedMention})`, 'gi');
      
      const nextElements: React.ReactNode[] = [];
      elements.forEach((el) => {
        if (typeof el !== 'string') {
          nextElements.push(el);
          return;
        }
        
        const parts = el.split(regex);
        parts.forEach((part) => {
          if (part.toLowerCase() === mentionText.toLowerCase()) {
            nextElements.push(
              <HoverCard key={`${v.id}-${Math.random()}`} openDelay={200}>
                <HoverCardTrigger asChild>
                  <Link 
                    href={`/diskusi/desa/${v.id}`} 
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary font-bold hover:underline cursor-pointer relative z-10"
                  >
                    {part}
                  </Link>
                </HoverCardTrigger>
                <HoverCardContent 
                  className="w-80 p-0 rounded-3xl border-2 border-primary/10 overflow-hidden shadow-2xl bg-popover/95 backdrop-blur-md z-[100]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative h-20 bg-muted">
                    {v.villageThumbnail ? (
                      <img src={v.villageThumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-primary/30 to-orange-500/30" />
                    )}
                    <div className="absolute -bottom-6 left-4">
                      {v.profileImage ? (
                        <img src={v.profileImage} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-background shadow-md" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm border-2 border-background shadow-md">
                          {v.villageName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 pt-8 space-y-2">
                    <div>
                      <h4 className="text-sm font-black leading-tight text-foreground">Desa {v.villageName}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Kepala Desa: {v.adminName}</p>
                    </div>
                    {v.catatan && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                        {v.catatan}
                      </p>
                    )}
                    <div className="flex gap-4 pt-1 text-[10px] font-bold text-muted-foreground border-t border-dashed">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span>{parseFloat(v.latitude).toFixed(4)}, {parseFloat(v.longitude).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          } else {
            nextElements.push(part);
          }
        });
      });
      elements = nextElements;
    });

    const finalElements: React.ReactNode[] = [];
    elements.forEach((el) => {
      if (typeof el !== 'string') {
        finalElements.push(el);
        return;
      }
      
      const hashRegex = /(#\w+)/gi;
      const parts = el.split(hashRegex);
      parts.forEach((part) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          finalElements.push(
            <button
              key={`${part}-${Math.random()}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="text-primary font-semibold hover:underline relative z-10"
            >
              {part}
            </button>
          );
        } else {
          finalElements.push(part);
        }
      });
    });

    return finalElements;
  };

  const compData = parseComparativeContent(post.content);

  useEffect(() => {
    const data = parseComparativeContent(post.content);
    if (!data) return;
    data.slots.forEach(slot => {
      if (slot.type === "post" && slot.postId && !fetchedIdsRef.current.has(slot.postId)) {
        fetchedIdsRef.current.add(slot.postId);
        fetch(`/api/diskusi/posts/${slot.postId}`)
          .then(res => res.json())
          .then(resData => {
            if (resData?.post) {
              setFetchedPosts(prev => ({ ...prev, [slot.postId!]: resData.post }));
            }
          })
          .catch(err => {
            console.error("Gagal memuat post pembanding:", err);
          });
      }
    });
  }, [post.content]);

  const toggleVoice = (url: string) => {
    if (playingVoice === url) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingVoice(url);
      }
    }
  };

  const getUrl = () => `${window.location.origin}/diskusi/${post.id}`;

  const shareOptions = [
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`Lihat diskusi ini: ${getUrl()}`)}`, "_blank"),
    },
    {
      label: "Telegram",
      icon: <TelegramIcon />,
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(getUrl())}&text=${encodeURIComponent(post.content.slice(0, 80))}`, "_blank"),
    },
    {
      label: "Email",
      icon: <Mail className="w-3.5 h-3.5 text-muted-foreground" />,
      action: () => window.open(`mailto:?subject=${encodeURIComponent("Diskusi Warga")}&body=${encodeURIComponent(`${post.content.slice(0, 100)}\n\n${getUrl()}`)}`, "_blank"),
    },
    {
      label: "Instagram (copy link)",
      icon: <InstagramIcon />,
      action: () => { navigator.clipboard.writeText(getUrl()); toast.success("Link disalin, tempel di Instagram!"); },
    },
  ];

  const copyLink = () => { navigator.clipboard.writeText(getUrl()); toast.success("Link disalin!"); };

  const saveSticker = (stickerId?: string, stickerUrl?: string) => {
    if (!stickerId && !stickerUrl) return;
    
    const saved = localStorage.getItem("my_stickers");
    let list = [];
    if (saved) {
      try { list = JSON.parse(saved); } catch (e) { list = []; }
    }

    const exists = list.find((s: any) => (stickerId && s.id === stickerId) || (stickerUrl && s.url === stickerUrl));
    if (exists) {
      toast.error("Stiker sudah ada di koleksi!");
      return;
    }

    const newSticker = {
      id: stickerId || `saved-${Date.now()}`,
      url: stickerUrl || getStickerById(stickerId!)?.url,
      emoji: getStickerById(stickerId!)?.emoji,
      label: "Stiker Simpanan",
      category: "koleksi",
    };

    list.push(newSticker);
    localStorage.setItem("my_stickers", JSON.stringify(list));
    toast.success("Stiker disimpan ke koleksi!");
  };

  const sticker = post.stickerId ? getStickerById(post.stickerId) : null;
  const hasSticker = sticker || post.stickerUrl || (post.stickers && post.stickers.length > 0);

  return (
    <article
      className={cn(
        compData
          ? "rounded-2xl border-2 border-foreground/10 bg-gradient-to-b from-card to-muted/5 overflow-hidden transition-all hover:shadow-lg hover:shadow-foreground/5 hover:border-foreground/30 relative"
          : "rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/20",
        isFeed && "flex"
      )}
    >
      {/* Engagement Column (Desktop) - No Like Button */}
      {isFeed && (
        <div className="hidden sm:flex flex-col items-center gap-2 px-3 py-6 bg-muted/20 border-r min-w-[64px]">
          <Link href={`/diskusi/${post.id}#reply-form`} className="flex flex-col items-center gap-1 group">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Reply className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Balas</span>
          </Link>
          <div className="h-px w-4 bg-border my-1" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold tabular-nums text-primary">{post.replyCount}</span>
            <span className="text-[8px] font-bold uppercase text-muted-foreground/60">Balasan</span>
          </div>
          <div className="h-px w-4 bg-border my-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10">
                <Share2 className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-48">
              {shareOptions.map((o) => (
                <DropdownMenuItem key={o.label} onClick={o.action} className="gap-2 text-xs">
                  <span>{o.icon}</span> {o.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyLink} className="gap-2 text-xs">
                <Copy className="w-3.5 h-3.5" /> Salin Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex-1 p-5 space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/10">
                {post.authorAlias.slice(0, 2).toUpperCase()}
              </div>
              <span className="font-semibold text-sm">{post.authorAlias}</span>
              {post.villageName && (
                <Badge variant="secondary" className="text-[10px] gap-1 px-2 h-5 rounded-full bg-primary/5 text-primary border-none">
                  <MapPin className="w-2.5 h-2.5" />
                  {post.villageName}
                </Badge>
              )}
              {post.adminRating && (
                <Badge className="text-[10px] gap-1 px-2 h-5 bg-primary/10 text-primary border-none rounded-full">
                  ✓ Ditanggapi
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/70 font-medium">
              Post #{post.id.slice(0, 8)} · {new Date(post.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {!isFeed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Share2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-48">
                {shareOptions.map((o) => (
                  <DropdownMenuItem key={o.label} onClick={o.action} className="gap-2 text-xs">
                    <span>{o.icon}</span> {o.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyLink} className="gap-2 text-xs">
                  <Copy className="w-3.5 h-3.5" /> Salin Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Media Grid (ABOVE TEXT - Smaller Preview) */}
        {!compData && post.media.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2.5">
            {post.media.map((m, i) => {
              if (m.type === "voice") {
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-foreground/5 rounded-xl border border-foreground/10 w-full max-w-xs shrink-0">
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      className="rounded-full h-8 w-8 shrink-0 bg-foreground hover:bg-foreground/90 text-background"
                      onClick={(e) => { e.stopPropagation(); toggleVoice(m.url); }}
                    >
                      {playingVoice === m.url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </Button>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Voice Note</span>
                        <Mic className="w-3 h-3 opacity-40" />
                      </div>
                      <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                        <div className={cn("h-full bg-primary transition-all duration-300", playingVoice === m.url ? "w-full" : "w-0")} />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={i} 
                  className="relative rounded-xl overflow-hidden border bg-black w-20 h-20 sm:w-24 sm:h-24 group cursor-pointer shrink-0 shadow-sm hover:shadow transition-shadow"
                  onClick={() => setPreviewMedia({ type: m.type, url: m.url })}
                >
                  {m.type === "video" ? (
                    <video src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {compData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-foreground/5 text-foreground dark:text-foreground/90">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-foreground dark:text-foreground/90">Analisis Komparatif</span>
                <span className="text-[9px] font-medium text-muted-foreground ml-1.5">Perbandingan Multi-Slot</span>
              </div>
            </div>

            <div className={cn(
              "grid gap-4 relative items-stretch",
              compData.slots.length === 1 ? "grid-cols-1" :
              compData.slots.length === 2 ? "grid-cols-2" :
              compData.slots.length === 3 ? "grid-cols-3" :
              "grid-cols-2 lg:grid-cols-4"
            )}>
              {compData.slots.map((slot, index) => {
                const label = slot.label || String.fromCharCode(65 + index);
                
                if (slot.type === "post") {
                  const fetchedPost = slot.postId ? fetchedPosts[slot.postId] : null;
                  
                  if (!fetchedPost) {
                    const isFailed = fetchedIdsRef.current.has(slot.postId || "") && !fetchedPost;
                    if (isFailed) {
                      return (
                        <div key={index} className="flex flex-col bg-muted/20 border border-dashed border-destructive/20 rounded-xl p-3 min-h-[120px] justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">SLOT {label}</span>
                            <Badge variant="destructive" className="text-[8px] px-1.5 py-0 font-extrabold uppercase">Terhapus</Badge>
                          </div>
                          <div className="my-auto py-2 text-center">
                            <p className="text-[10px] text-destructive/80 font-medium">Post #{slot.postId?.slice(0,8)} tidak ditemukan</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={index} className="flex flex-col bg-muted/20 border border-border/40 rounded-xl min-h-[120px] justify-center items-center p-4">
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin mb-1" />
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Memuat Post...</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={index} className="flex flex-col bg-card border border-border/80 hover:border-foreground/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 dark:bg-muted/10 border-b border-border/40">
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">SLOT {label}</span>
                        <Link href={`/diskusi/${fetchedPost.id}`} className="hover:underline flex items-center gap-1">
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary/20 text-primary bg-primary/5 font-extrabold uppercase">
                            Post #{fetchedPost.id.slice(0, 6)}
                          </Badge>
                        </Link>
                      </div>
                      
                      {fetchedPost.media && fetchedPost.media.length > 0 && (
                        <div 
                          className="relative aspect-video w-full bg-black/90 overflow-hidden border-b border-border/20 group cursor-pointer"
                          onClick={() => setPreviewMedia({ type: fetchedPost.media[0].type, url: fetchedPost.media[0].url })}
                        >
                          {fetchedPost.media[0].type === "video" ? (
                            <video src={fetchedPost.media[0].url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={fetchedPost.media[0].url} alt={`Post ${fetchedPost.id}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          )}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                      
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-bold text-primary">
                              {fetchedPost.authorAlias.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[10px] text-foreground/80">@{fetchedPost.authorAlias}</span>
                          </div>
                          <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3">
                            {fetchedPost.content}
                          </p>
                        </div>
                        <Link href={`/diskusi/${fetchedPost.id}`} className="text-[9px] font-bold text-primary hover:underline self-end flex items-center gap-0.5">
                          Lihat Post →
                        </Link>
                      </div>
                    </div>
                  );
                }

                // Local slot
                const localMediaItems = post.media.filter(m => m.type !== "voice");
                const localSlotsCountBefore = compData.slots.slice(0, index).filter(s => s.type === "local").length;
                const slotMedia = localMediaItems[localSlotsCountBefore];
                
                const slotSticker = slot.stickerId || slot.stickerUrl 
                  ? (getStickerById(slot.stickerId!) || { url: slot.stickerUrl, emoji: "✨" })
                  : null;

                return (
                  <div key={index} className="flex flex-col bg-muted/20 dark:bg-muted/5 border border-border/60 hover:border-foreground/20 rounded-xl overflow-hidden transition-all duration-200">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 dark:bg-muted/10 border-b border-border/40">
                      <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">SLOT {label}</span>
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-foreground/10 text-foreground dark:text-foreground/80 bg-foreground/5 font-extrabold uppercase">Lokal</Badge>
                    </div>
                    
                    {slotMedia && (
                      <div 
                        className="relative aspect-video w-full bg-black/90 overflow-hidden border-b border-border/20 group cursor-pointer"
                        onClick={() => setPreviewMedia({ type: slotMedia.type, url: slotMedia.url })}
                      >
                        {slotMedia.type === "video" ? (
                          <video src={slotMedia.url} className="w-full h-full object-contain" />
                        ) : (
                          <img src={slotMedia.url} alt={`Media Slot ${label}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                      <p className="text-xs text-foreground/85 leading-relaxed italic whitespace-pre-wrap">
                        "{slot.value}"
                      </p>

                      {slotSticker && (
                        <div className="relative group/slot-sticker inline-block self-end">
                          <div className="w-14 h-14 p-1.5 bg-background/50 rounded-xl border border-primary/10 shadow-sm backdrop-blur-sm">
                            {slotSticker.url ? (
                              <img src={slotSticker.url} alt="Stiker" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-2xl flex items-center justify-center h-full">{(slotSticker as any).emoji}</span>
                            )}
                          </div>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full opacity-0 group-hover/slot-sticker:opacity-100 transition-all shadow-md bg-background/90"
                            onClick={() => saveSticker(slot.stickerId, slot.stickerUrl)}
                          >
                            <Star className="w-2.5 h-2.5 fill-current" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {compData.slots.length === 2 && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background font-black text-xs shadow-md shadow-foreground/10 border-2 border-background">
                  VS
                </div>
              )}
            </div>

            {post.media.filter(m => m.type === "voice").length > 0 && (
              <div className="space-y-2">
                {post.media.filter(m => m.type === "voice").map((vn, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-foreground/5 rounded-xl border border-foreground/10 max-w-sm">
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      className="rounded-full h-10 w-10 shrink-0 shadow-lg shadow-foreground/5 bg-foreground hover:bg-foreground/90 text-background"
                      onClick={() => toggleVoice(vn.url)}
                    >
                      {playingVoice === vn.url ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-foreground dark:text-foreground/80">Audio Analisis</span>
                        <Mic className="w-3 h-3 text-foreground/40" />
                      </div>
                      <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
                        <div className={cn("h-full bg-foreground transition-all duration-300", playingVoice === vn.url ? "w-full" : "w-0")} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {compData.conclusion && (
              <div className="bg-foreground/[0.02] dark:bg-foreground/[0.01] border border-foreground/10 rounded-2xl p-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-foreground dark:text-foreground/80">Kesimpulan Analisis</span>
                  <div className="h-px flex-1 bg-foreground/10" />
                </div>
                
                {isFeed ? (
                  <Link href={`/diskusi/${post.id}`} className="block group">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap group-hover:text-foreground/90 line-clamp-4 text-foreground/90">
                      {compData.conclusion}
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{compData.conclusion}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {isFeed ? (
              <div 
                onClick={() => router.push(`/diskusi/${post.id}`)}
                className="text-sm leading-relaxed whitespace-pre-wrap hover:text-foreground/90 cursor-pointer line-clamp-6"
              >
                {renderParsedContent(post.content)}
              </div>
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderParsedContent(post.content)}</div>
            )}
          </>
        )}

        {post.hashtags.filter(h => !h.toLowerCase().includes("analisis") && !h.toLowerCase().includes("kompara") && !h.toLowerCase().includes("kompera")).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags
              .filter(h => !h.toLowerCase().includes("analisis") && !h.toLowerCase().includes("kompara") && !h.toLowerCase().includes("kompera"))
              .map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onTagClick?.(h)}
                className="text-xs font-medium text-primary hover:bg-primary/10 px-2 py-0.5 rounded-md transition-colors"
              >
                #{h}
              </button>
            ))}
          </div>
        )}

        {post.taggedAdmins.length > 0 && (
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tag Admin:</span>
            <div className="flex flex-wrap gap-1">
              {post.taggedAdmins.map((a) => (
                <span key={a} className="text-[10px] font-semibold text-primary/80">@{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Stickers Grid (BELOW TEXT) */}
        {hasSticker && (
          <div className="flex flex-wrap gap-3 my-2 pt-2.5 border-t border-dashed border-muted-foreground/10">
            {/* Legacy Single Sticker */}
            {!post.stickers && (post.stickerId || post.stickerUrl) && (
              <div className="relative group/sticker inline-block">
                <div className="w-20 h-20 sm:w-24 sm:h-24">
                  {post.stickerUrl || sticker?.url ? (
                    <img src={post.stickerUrl || sticker?.url} alt="Stiker" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-5xl">{sticker?.emoji}</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow bg-background/90"
                  onClick={() => saveSticker(post.stickerId, post.stickerUrl)}
                  title="Simpan Stiker"
                >
                  <Star className="w-3 h-3 fill-current" />
                </Button>
              </div>
            )}
            
            {/* Multi Stickers */}
            {post.stickers?.map((s, idx) => {
              const sData = s.id ? getStickerById(s.id) : null;
              return (
                <div key={idx} className="relative group/sticker inline-block">
                  <div className="w-20 h-20 sm:w-24 sm:h-24">
                    {s.url || sData?.url ? (
                      <img src={s.url || sData?.url} alt="Stiker" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-5xl">{sData?.emoji}</span>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full opacity-0 group-hover/sticker:opacity-100 transition-opacity shadow bg-background/90"
                    onClick={() => saveSticker(s.id, s.url)}
                    title="Simpan Stiker"
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {post.poll && (
          <div className="bg-muted/20 p-1 rounded-2xl">
            <DiskusiPollView postId={post.id} poll={post.poll} compact={isFeed} />
          </div>
        )}

        <audio ref={audioRef} className="hidden" onEnded={() => setPlayingVoice(null)} />

        {post.adminRating?.note && (
          <div className="bg-primary/5 border-l-4 border-primary p-3 rounded-r-xl relative group/admin">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Tanggapan Resmi Desa</p>
            <p className="text-sm text-foreground leading-relaxed">
              {post.adminRating.note}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">— {post.adminRating.ratedBy}</p>
              <Link
                href={`/diskusi/${post.id}#reply-form`}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
              >
                <Reply className="w-3 h-3" />
                Balas Tanggapan
              </Link>
            </div>
          </div>
        )}

        {isFeed && (
          <footer className="flex items-center justify-between pt-3 border-t border-dashed">
            <div className="flex items-center gap-4">
              <Link
                href={`/diskusi/${post.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {post.replyCount} Balasan
              </Link>
              <Link
                href={`/diskusi/${post.id}#reply-form`}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-colors"
              >
                <Reply className="w-4 h-4" />
                Balas
              </Link>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary" asChild>
              <Link href={`/diskusi/${post.id}`}>Baca Selengkapnya</Link>
            </Button>
          </footer>
        )}
      </div>

      {/* Media Preview Overlay */}
      {previewMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-200"
          onClick={() => setPreviewMedia(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full h-12 w-12"
            onClick={() => setPreviewMedia(null)}
          >
            <X className="w-8 h-8" />
          </Button>
          
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {previewMedia.type === "video" ? (
              <video 
                src={previewMedia.url} 
                controls 
                autoPlay 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img 
                src={previewMedia.url} 
                alt="Preview" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </article>
  );
}
