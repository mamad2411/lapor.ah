"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WargaShell } from "@/components/warga/warga-shell";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  ArrowLeftRight, 
  Loader2, 
  ChevronLeft, 
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Link as LinkIcon, 
  Plus, 
  X, 
  BarChart3, 
  ImagePlus,
  MapPin,
  Mic,
  Square,
  Hash,
  Send,
  Trash2,
  Play,
  AudioLines,
  Vote,
  LayoutGrid
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StickerPicker } from "@/components/warga/sticker-picker";
import { StickerItem } from "@/lib/warga/types";
import { getStickerById } from "@/lib/warga/stickers";

export default function PostComparePage() {
  return (
    <WargaShell>
      <Suspense fallback={<div className="py-20 flex justify-center"><Spinner size="lg" text="Memuat modul komparasi..." /></div>}>
        <CompareContent />
      </Suspense>
    </WargaShell>
  );
}

interface SlotData {
  id: string;
  mode: "id" | "local";
  postId: string;
  postData: any;
  localData: { 
    content: string; 
    media: any[];
    stickerId?: string;
    stickerUrl?: string;
    stickers?: { id?: string; url?: string }[];
  };
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [slots, setSlots] = useState<SlotData[]>([
    { id: "1", mode: "id", postId: searchParams.get("a") || "", postData: null, localData: { content: "", media: [] } },
    { id: "2", mode: "id", postId: searchParams.get("b") || "", postData: null, localData: { content: "", media: [] } }
  ]);

  // Global Interaction States
  const [globalContent, setGlobalContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
  const [mentionList, setMentionList] = useState<any[]>([]);
  const [hashtagList, setHashtagList] = useState<string[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Global VN States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [vnUrl, setVnUrl] = useState<string | null>(null);
  const [selectedStickers, setSelectedStickers] = useState<StickerItem[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Global Polling State
  const [showGlobalPoll, setShowGlobalPoll] = useState(false);
  const [globalPoll, setGlobalPoll] = useState({ question: "", options: ["", ""] });

  const fileRef = useRef<HTMLInputElement>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/villages/list").then((r) => r.json()).then((d) => setVillages(d.villages || []));
  }, []);

  const addSlot = () => {
    if (slots.length >= 4) {
      toast.error("Maksimal 4 slot perbandingan");
      return;
    }
    setSlots(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      mode: "id", 
      postId: "", 
      postData: null, 
      localData: { content: "", media: [], stickerId: undefined, stickerUrl: undefined } 
    }]);
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const updateSlot = (id: string, data: Partial<SlotData>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const fetchPost = async (id: string, slotId: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/diskusi/posts/${id}`);
      const data = await res.json();
      if (res.ok) updateSlot(slotId, { postData: data.post });
      else updateSlot(slotId, { postData: null });
    } catch (err) {
      console.error(err);
      updateSlot(slotId, { postData: null });
    }
  };

  useEffect(() => {
    slots.forEach(s => {
      if (s.mode === "id" && s.postId && !s.postData) {
        fetchPost(s.postId, s.id);
      }
    });
  }, [slots]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setGlobalContent(val);
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);

    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      const q = mentionMatch[1].toLowerCase();
      setMentionQuery(q);
      setHashtagQuery(null);
      setMentionList(villages.filter(v => v.villageName.toLowerCase().includes(q) || v.adminName.toLowerCase().includes(q)).slice(0, 6));
    } else {
      setMentionQuery(null);
    }

    const hashMatch = textBefore.match(/#(\w*)$/);
    if (hashMatch) {
      const q = hashMatch[1].toLowerCase();
      setHashtagQuery(q);
      setMentionQuery(null);
      setHashtagList(["perbandingan", "analisis_desa", "diskusi_warga"].filter(h => h.includes(q)));
    } else {
      setHashtagQuery(null);
    }
  };

  const insertSuggestion = (prefix: string, value: string) => {
    const cursor = textareaRef.current?.selectionStart ?? globalContent.length;
    const textBefore = globalContent.slice(0, cursor);
    const textAfter = globalContent.slice(cursor);
    const regex = new RegExp(`${prefix}(\\w*)$`);
    const replaced = textBefore.replace(regex, `${prefix}${value} `);
    setGlobalContent(replaced + textAfter);
    setMentionQuery(null);
    setHashtagQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/ogg; codecs=opus" });
        const url = URL.createObjectURL(blob);
        setVnUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast.error("Izin mikrofon ditolak");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const uploadMedia = async (file: File, type: "image" | "video") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", "compare");
    try {
      toast.loading("Mengunggah media...", { id: "upload" });
      const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newMedia = { type, url: data.url };
      setSlots(prev => prev.map(s => s.id === activeSlotId ? {
        ...s,
        localData: { ...s.localData, media: [...s.localData.media, newMedia] }
      } : s));
      toast.success("Media terunggah", { id: "upload" });
    } catch (err) {
      toast.error("Gagal unggah", { id: "upload" });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !activeSlotId) return;
    
    const fd = new FormData();
    fd.append("file", f);
    fd.append("path", "compare");
    
    try {
      toast.loading("Mengunggah media...", { id: "upload" });
      const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const newMedia = {
        type: f.type.startsWith("video/") ? "video" : "image",
        url: data.url,
      };

      setSlots(prev => prev.map(s => s.id === activeSlotId ? {
        ...s,
        localData: { ...s.localData, media: [...s.localData.media, newMedia] }
      } : s));
      toast.success("Media terunggah", { id: "upload" });
    } catch (err) {
      toast.error("Gagal unggah", { id: "upload" });
    }
  };

  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    if (!globalContent.trim() && selectedStickers.length === 0) {
      toast.error("Tulis kesimpulan atau pilih stiker");
      return;
    }
    if (globalContent.trim() && globalContent.trim().length < 5 && selectedStickers.length === 0) {
      toast.error("Tulis kesimpulan minimal 5 karakter");
      return;
    }
    setPublishing(true);
    try {
      // Extract hashtags & tagged admins from content
      const hashtags = [...globalContent.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase());
      const taggedAdmins = [...globalContent.matchAll(/@(\w[\w\s]*)/g)].map((m) => m[1].trim());

      // Collect media from all local slots
      const media = slots
        .filter((s) => s.mode === "local")
        .flatMap((s) => s.localData.media)
        .slice(0, 4);

      // Build compare summary as prefix
      const slotSummary = slots
        .map((s, i) => {
          const label = String.fromCharCode(65 + i);
          if (s.mode === "id" && s.postId) return `[${label}: Post#${s.postId}]`;
          if (s.mode === "local" && s.localData.content) {
            let str = `[${label}: "${s.localData.content.slice(0, 40)}"`;
            if (s.localData.stickerId) str += ` {s:${s.localData.stickerId}}`;
            else if (s.localData.stickerUrl) str += ` {u:${s.localData.stickerUrl}}`;
            str += `]`;
            return str;
          }
          return null;
        })
        .filter(Boolean)
        .join(" vs ");

      const fullContent = slotSummary
        ? `🔍 Analisis Komparatif: ${slotSummary}\n\n${globalContent}`
        : globalContent;

      const body: Record<string, unknown> = {
        content: fullContent,
        hashtags: hashtags.length ? hashtags : ["analisis_komparatif"],
        taggedAdmins,
        media,
        stickers: selectedStickers.map(s => ({ id: s.id, url: s.url })),
      };

      if (showGlobalPoll && globalPoll.question.trim() && globalPoll.options.filter((o) => o.trim()).length >= 2) {
        body.poll = {
          question: globalPoll.question.trim(),
          options: globalPoll.options.filter((o) => o.trim()),
        };
      }

      const res = await fetch("/api/diskusi/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Hasil analisis berhasil dipublikasikan!");
      router.push(`/diskusi/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal publikasi");
    } finally {
      setPublishing(false);
    }
  }

  const handleDrop = async (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      setActiveSlotId(slotId);
      await uploadMedia(file, file.type.startsWith("video/") ? "video" : "image");
    }
  };

  const renderSlotUI = (slot: SlotData, index: number) => {
    const slotStickers = slot.localData.stickers || [];

    return (
      <div 
        key={slot.id} 
        className="space-y-4 relative group animate-in fade-in slide-in-from-bottom-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => slot.mode === "local" && handleDrop(e, slot.id)}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-primary uppercase tracking-tighter text-xs">SLOT {String.fromCharCode(65 + index)}</p>
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-muted/50 rounded-lg">
              <button 
                onClick={() => updateSlot(slot.id, { mode: "id" })}
                className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", slot.mode === "id" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                ID
              </button>
              <button 
                onClick={() => updateSlot(slot.id, { mode: "local" })}
                className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", slot.mode === "local" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                LOKAL
              </button>
            </div>
            {slots.length > 1 && (
              <button onClick={() => removeSlot(slot.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {slot.mode === "id" ? (
          <div className="space-y-4">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                placeholder="Post ID..." 
                value={slot.postId} 
                onChange={(e) => {
                  updateSlot(slot.id, { postId: e.target.value, postData: null });
                  if (e.target.value.length > 5) fetchPost(e.target.value, slot.id);
                }} 
                className="rounded-xl bg-muted/20 border-none h-9 text-[10px] pl-9" 
              />
            </div>
            
            {slot.postData ? (
              <Card className="overflow-hidden border-2 border-primary/5 shadow-lg">
                {slot.postData.media?.length > 0 && (
                  <div className="aspect-video bg-black">
                    {slot.postData.media[0].type === "video" ? (
                      <video src={slot.postData.media[0].url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={slot.postData.media[0].url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <CardContent className="p-3 space-y-2">
                  <p className="font-bold text-[10px]">@{slot.postData.authorAlias}</p>
                  <p className="text-[10px] leading-relaxed line-clamp-3 opacity-80">{slot.postData.content}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="aspect-square rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-1">
                <Search className="w-5 h-5 opacity-20" />
                <p className="text-[9px] font-medium italic">Masukkan ID</p>
              </div>
            )}
          </div>
        ) : (
          <Card className="overflow-hidden border-2 border-primary/5 shadow-lg p-3 space-y-3 relative">
             {slot.localData.media.length > 0 ? (
               <div className="relative h-24 w-full rounded-xl overflow-hidden bg-black group shrink-0">
                 {slot.localData.media[0].type === "video" ? (
                    <video src={slot.localData.media[0].url} className="w-full h-full object-cover" />
                 ) : (
                    <img src={slot.localData.media[0].url} alt="" className="w-full h-full object-cover" />
                 )}
                 <button 
                  onClick={() => updateSlot(slot.id, { localData: { ...slot.localData, media: [] } })}
                  className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <X className="w-2.5 h-2.5" />
                 </button>
               </div>
             ) : (
               <button 
                onClick={() => { setActiveSlotId(slot.id); fileRef.current?.click(); }}
                className="w-full h-24 rounded-xl border-2 border-dashed border-primary/10 bg-primary/5 flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-colors shrink-0"
               >
                 <ImagePlus className="w-4 h-4 text-primary/40" />
                 <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest">Upload / Drop</span>
               </button>
             )}

             <div className="space-y-2">
               <Textarea 
                 placeholder="Konten draf..."
                 className="min-h-[80px] text-[10px] border-none focus-visible:ring-0 p-0 resize-none bg-transparent"
                 value={slot.localData.content}
                 onChange={(e) => updateSlot(slot.id, { localData: { ...slot.localData, content: e.target.value } })}
               />

               {/* Slot Stickers Preview */}
               {slotStickers.length > 0 && (
                 <div className="flex flex-wrap gap-2 animate-in zoom-in-95">
                   {slotStickers.map((sticker, sIdx) => {
                     const sData = sticker.id ? getStickerById(sticker.id) : null;
                     return (
                       <div key={sIdx} className="relative group/slot-sticker inline-block">
                         <div className="w-16 h-16 p-2 bg-primary/5 rounded-xl border border-primary/20">
                           {sticker.url || sData?.url ? (
                             <img src={sticker.url || sData?.url} alt="Stiker" className="w-full h-full object-contain" />
                           ) : (
                             <span className="text-3xl flex items-center justify-center h-full">{(sData as any)?.emoji || "✨"}</span>
                           )}
                         </div>
                         <button
                           onClick={() => {
                             const updated = slotStickers.filter((_, i) => i !== sIdx);
                             updateSlot(slot.id, { localData: { ...slot.localData, stickers: updated } });
                           }}
                           className="absolute -top-1.5 -right-1.5 p-1 bg-destructive text-white rounded-full opacity-0 group-hover/slot-sticker:opacity-100 transition-opacity shadow-sm"
                         >
                           <X className="w-2.5 h-2.5" />
                         </button>
                       </div>
                     );
                   })}
                 </div>
               )}
             </div>

             <div className="flex justify-end border-t border-primary/5 pt-2">
                <StickerPicker 
                  size="sm"
                  onSelect={(s) => {
                    const currentStickers = slot.localData.stickers || [];
                    updateSlot(slot.id, { localData: { ...slot.localData, stickers: [...currentStickers, { id: s.id, url: s.url }] } });
                  }}
                />
             </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="py-8 max-w-6xl mx-auto space-y-8 pb-32">
      <input type="file" ref={fileRef} className="hidden" accept="image/*,video/*" onChange={handleUpload} />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <SectionHeading
            label="Multi-Compare Studio"
            title="Analisis Komparatif"
            description="Bandingkan hingga 4 postingan sekaligus untuk mendapatkan insight visual yang mendalam."
          />
        </div>
        <Button 
          onClick={addSlot} 
          disabled={slots.length >= 4}
          className="rounded-full h-12 w-12 p-0 shadow-lg shadow-primary/20"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className={cn(
        "grid gap-6 items-start relative",
        slots.length === 1 ? "grid-cols-1 max-w-xl mx-auto" : 
        slots.length === 2 ? "grid-cols-2" : 
        slots.length === 3 ? "grid-cols-3" : 
        "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {slots.map((s, i) => renderSlotUI(s, i))}
      </div>

      {/* Global Interaction Area */}
      <div className="space-y-6 pt-12 border-t">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-inner">#</div>
          <div>
            <h3 className="font-display text-xl tracking-tight">Kesimpulan Analisis</h3>
            <p className="text-xs text-muted-foreground">Berikan tanggapan akhir, mention pihak terkait, dan buat polling perbandingan.</p>
          </div>
        </div>

        <Card className="border-2 border-primary/5 shadow-2xl bg-card/50 backdrop-blur-sm relative overflow-visible">
          <CardContent className="p-6 space-y-4">
            <div className="relative">
              <Textarea 
                ref={textareaRef}
                placeholder="Tulis opini perbandingan kamu di sini..."
                className="min-h-[140px] text-sm border-none focus-visible:ring-0 p-0 resize-none bg-transparent"
                value={globalContent}
                onChange={handleContentChange}
              />

              {/* Stickers Preview - BELOW text */}
              {selectedStickers.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2 animate-in slide-in-from-top-2 duration-200">
                  {selectedStickers.map((sticker, idx) => (
                    <div key={`${sticker.id}-${idx}`} className="relative group/sticker-preview inline-block">
                      <div className="w-24 h-24 p-3 bg-primary/5 rounded-2xl border-2 border-primary/20 shadow-sm">
                        {sticker.url ? (
                          <img src={sticker.url} alt="Stiker" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-6xl flex items-center justify-center h-full leading-none">{sticker.emoji}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedStickers(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover/sticker-preview:opacity-100 transition-all shadow-lg hover:scale-110"
                        title="Hapus Stiker"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Autocomplete Dropdown */}
              {(mentionQuery !== null || hashtagQuery !== null) && (
                <div className="absolute z-50 left-0 bottom-full mb-2 w-64 rounded-2xl border bg-popover shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-1.5">
                    {mentionQuery !== null && mentionList.map((v: any) => (
                      <button key={v.id} onMouseDown={(e) => { e.preventDefault(); insertSuggestion("@", v.villageName); }} className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted rounded-xl transition-colors">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">{v.villageName.charAt(0)}</div>
                        <div><p className="text-xs font-semibold">@{v.villageName}</p><p className="text-[10px] text-muted-foreground">{v.adminName}</p></div>
                      </button>
                    ))}
                    {hashtagQuery !== null && hashtagList.map((h) => (
                      <button key={h} onMouseDown={(e) => { e.preventDefault(); insertSuggestion("#", h); }} className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted rounded-xl transition-colors">
                        <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-600"><Hash className="w-3.5 h-3.5" /></div>
                        <p className="text-xs font-semibold">#{h}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {vnUrl && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95">
                <Button size="icon" variant="ghost" className="rounded-full bg-background" onClick={() => new Audio(vnUrl).play()}><Play className="w-4 h-4" /></Button>
                <div className="flex-1 flex items-center gap-2"><AudioLines className="w-12 h-6 text-primary opacity-40" /><span className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice Note Analisis</span></div>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setVnUrl(null)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-primary/5">
              <div className="flex items-center gap-2">
                <StickerPicker 
                  onSelect={(s) => setSelectedStickers(prev => [...prev, s])} 
                  selectedId={selectedStickers[selectedStickers.length - 1]?.id}
                />
                
                <Button 
                  variant={isRecording ? "destructive" : "ghost"} 
                  size="icon" 
                  className={cn("rounded-full", isRecording && "animate-pulse")}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                
                <Button 
                  variant={showGlobalPoll ? "secondary" : "ghost"} 
                  size="icon" 
                  className="rounded-full"
                  onClick={() => setShowGlobalPoll(!showGlobalPoll)}
                >
                  <Vote className="w-5 h-5" />
                </Button>

                {isRecording && <span className="text-[10px] font-bold text-destructive tabular-nums animate-in fade-in">REC {recordingTime}s</span>}
              </div>

              <Button className="rounded-full px-8 gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all" onClick={handlePublish} disabled={publishing}>
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publikasi Hasil
              </Button>
            </div>

            {showGlobalPoll && (
              <div className="p-4 bg-muted/30 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Polling Komparatif</span>
                  <button onClick={() => setShowGlobalPoll(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <Input 
                  placeholder="Apa pertanyaan untuk perbandingan ini?" 
                  className="h-10 text-sm bg-background border-none rounded-xl"
                  value={globalPoll.question}
                  onChange={(e) => setGlobalPoll(prev => ({ ...prev, question: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  {globalPoll.options.map((opt: string, i: number) => (
                    <div key={i} className="relative group/opt">
                        <Input 
                        placeholder={`Opsi ${i+1}`} 
                        className="h-9 text-xs bg-background border-none rounded-xl pr-8"
                        value={opt}
                        onChange={(e) => {
                            const nextOpts = [...globalPoll.options];
                            nextOpts[i] = e.target.value;
                            setGlobalPoll(prev => ({ ...prev, options: nextOpts }));
                        }}
                        />
                        {globalPoll.options.length > 2 && (
                            <button 
                                onClick={() => setGlobalPoll(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive opacity-0 group-hover/opt:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                  ))}
                </div>
                {globalPoll.options.length < 6 && (
                  <Button variant="ghost" size="sm" onClick={() => setGlobalPoll(prev => ({ ...prev, options: [...prev.options, ""] }))} className="text-[10px] h-7 gap-1 hover:bg-primary/5 text-primary font-bold">
                    <Plus className="w-3 h-3" /> Tambah Pilihan
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
