"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Send,
  Loader2,
  Plus,
  BarChart3,
  X,
  ChevronLeft,
  Mic,
  Square,
  AudioLines,
  Hash,
  ArrowLeftRight,
  Vote,
  Smile,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { VillageOption, StickerItem } from "@/lib/warga/types";
import { cn } from "@/lib/utils";
import { StickerPicker } from "./sticker-picker";

interface EditingMedia {
  type: "image" | "video" | "voice";
  url: string;
}

function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  if (typeof window === "undefined") return { top: 0, left: 0 };

  const div = document.createElement("div");
  const style = window.getComputedStyle(element);

  const propertiesToCopy = [
    "direction", "boxSizing", "width", "height", "overflowX", "overflowY",
    "borderWidth", "borderStyle", "borderColor",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
    "textTransform", "wordSpacing", "letterSpacing", "lineHeight",
    "textIndent", "textRendering", "wordBreak", "overflowWrap", "whiteSpace"
  ];

  propertiesToCopy.forEach((prop) => {
    div.style[prop as any] = style[prop as any];
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordBreak = "break-word";
  div.style.height = "auto";
  div.style.width = `${element.clientWidth}px`;

  const textContent = element.value.substring(0, position);
  div.textContent = textContent;

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);

  const spanLeft = span.offsetLeft;
  const spanTop = span.offsetTop;

  document.body.removeChild(div);

  let lh = parseInt(style.lineHeight);
  if (isNaN(lh)) {
    lh = parseInt(style.fontSize) * 1.5 || 24;
  }

  const maxLeft = Math.max(0, element.clientWidth - 260);
  const left = Math.max(0, Math.min(spanLeft, maxLeft));
  const top = spanTop + lh - element.scrollTop + 4;

  return { top, left };
}

export function DiskusiComposer() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [media, setMedia] = useState<EditingMedia[]>([]);
  const [selectedStickers, setSelectedStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [villages, setVillages] = useState<VillageOption[]>([]);

  // Mention & Hashtag States
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
  const [mentionList, setMentionList] = useState<VillageOption[]>([]);
  const [hashtagList, setHashtagList] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number }>({ top: 28, left: 0 });

  const updateDropdownCoords = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    
    const val = textarea.value;
    const textBefore = val.slice(0, cursor);
    const hasMention = /@[\w ]*$/.test(textBefore);
    const hasHashtag = /#\w*$/.test(textBefore);
    
    if (hasMention || hasHashtag) {
      const coords = getCaretCoordinates(textarea, cursor);
      setDropdownCoords(coords);
    }
  };

  // Voice Note states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/villages/list").then((r) => r.json()).then((d) => setVillages(d.villages || []));
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);

    // Mention detection — support nama multi-kata (e.g. @desa satrio)
    const mentionMatch = textBefore.match(/@([\w]+(?: [\w]+)*)?$/);
    if (mentionMatch) {
      const q = (mentionMatch[1] || "").toLowerCase().trim();
      setMentionQuery(q);
      setHashtagQuery(null);
      setMentionList(villages.filter(v => v.villageName.toLowerCase().includes(q) || v.adminName.toLowerCase().includes(q)).slice(0, 6));
      setTimeout(updateDropdownCoords, 0);
    } else {
      setMentionQuery(null);
    }

    // Hashtag detection
    const hashMatch = textBefore.match(/#(\w*)$/);
    if (hashMatch) {
      const q = hashMatch[1].toLowerCase();
      setHashtagQuery(q);
      setMentionQuery(null);
      setHashtagList(["pembangunan", "desa_digital", "gotong_royong", "lapor_ah"].filter(h => h.includes(q)));
      setTimeout(updateDropdownCoords, 0);
    } else {
      setHashtagQuery(null);
    }
  };

  const insertSuggestion = (prefix: string, value: string) => {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const textBefore = content.slice(0, cursor);
    const textAfter = content.slice(cursor);
    // Support multi-word: replace @anything (including spaces) at end
    const regex = prefix === "@" ? /@[\w ]*$/ : new RegExp(`${prefix}\\w*$`);
    const replaced = textBefore.replace(regex, `${prefix}${value} `);
    setContent(replaced + textAfter);
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
        const file = new File([blob], `vn_${Date.now()}.ogg`, { type: "audio/ogg" });
        await uploadMedia(file, "voice");
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

  async function uploadMedia(file: File, type: "image" | "video" | "voice") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", "diskusi");
    try {
      const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const newMedia: EditingMedia = { 
        type, 
        url: data.url, 
      };

      setMedia((prev) => [...prev, newMedia]);
      toast.success(type === "voice" ? "Voice Note tersimpan" : "Media terunggah");
    } catch (err) {
      toast.error("Gagal unggah media: " + (err instanceof Error ? err.message : "Error tidak dikenal"));
    }
  }

  async function handlePost() {
    if (!content.trim() && selectedStickers.length === 0 && media.length === 0) {
      toast.error("Tulis sesuatu atau pilih stiker untuk mengirim postingan");
      return;
    }
    if (content.trim() && content.trim().length < 5 && selectedStickers.length === 0) {
      toast.error("Konten diskusi minimal 5 karakter");
      return;
    }
    setLoading(true);
    try {
      const hashtags = [
        ...content.match(/#\w+/g)?.map((h: string) => h.slice(1)) || [],
      ];

      // Parse @mentions — exact match nama desa dari villages list
      const taggedAdmins = villages
        .filter((v) => content.toLowerCase().includes(`@${v.villageName.toLowerCase()}`))
        .map((v) => v.villageName);

      const taggedVillage = villages.find((v) =>
        taggedAdmins.some((t) => t.toLowerCase() === v.villageName.toLowerCase())
      );

      const body: Record<string, unknown> = {
        content,
        hashtags,
        taggedAdmins,
        villageName: taggedVillage?.villageName || "",
        villageId: taggedVillage?.id || undefined,
        authorRole: "warga",
        media: media,
        stickers: selectedStickers.map(s => ({ id: s.id, url: s.url })),
      };

      if (showPoll) {
        body.poll = {
          question: pollQuestion,
          options: pollOptions.map((o) => o.trim()).filter(Boolean),
          durationDays: 7,
        };
      }



      const res = await fetch("/api/diskusi/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Postingan berhasil dikirim!");
      router.push("/diskusi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal posting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-display tracking-tight">Buat Postingan Baru</h1>
      </div>

      <Card className="border-2 border-primary/5 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Media First Flow: Upload Bar */}
          <div className="p-4 border-b bg-muted/10">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMedia(f, f.type.startsWith("video/") ? "video" : "image");
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full gap-2 border-primary/20 text-primary hover:bg-primary/5 h-10 px-4"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="w-4 h-4" /> Media
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={() => router.push("/diskusi/compare")}
                title="Analisis Komparatif"
              >
                <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Media Preview Grid - Photos/Videos/VN ABOVE text with smaller size */}
            {media.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {media.map((m, i) => (
                  <div key={i} className="flex flex-col gap-1 items-start">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-primary/10 group bg-black shadow-sm shrink-0">
                      {m.type === "video" ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : m.type === "voice" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-primary/5 text-primary">
                          <AudioLines className="w-5 h-5 mb-0.5 animate-pulse" />
                          <span className="text-[7px] font-black uppercase tracking-widest">VN</span>
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      
                      <button
                        onClick={() => setMedia(media.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {m.type === "image" && (
                      <Input
                        placeholder="Nama/URL Backsound..."
                        value={m.bgMusic || ""}
                        onChange={(e) => {
                          const nextMedia = [...media];
                          nextMedia[i] = { ...nextMedia[i], bgMusic: e.target.value };
                          setMedia(nextMedia);
                        }}
                        className="w-20 h-6 text-[8px] px-1 bg-background border-primary/25 rounded-md focus-visible:ring-1"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Apa yang ingin kamu diskusikan hari ini? Gunakan @ untuk tag desa dan # untuk hashtag..."
                  className="min-h-[160px] text-lg border-none focus-visible:ring-0 p-0 resize-none placeholder:text-muted-foreground/50"
                  value={content}
                  onChange={handleContentChange}
                  onSelect={updateDropdownCoords}
                  onScroll={updateDropdownCoords}
                />
                
                {/* Unified Dropdown for @ and # */}
                {((mentionQuery !== null && mentionList.length > 0) || (hashtagQuery !== null && hashtagList.length > 0)) && (
                  <div 
                    style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                    className="absolute z-50 w-64 rounded-2xl border bg-popover shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 transition-all duration-75"
                  >
                    <div className="p-1.5">
                      {mentionQuery !== null && mentionList.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertSuggestion("@", v.villageName); }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted rounded-xl transition-colors"
                        >
                          {v.profileImage ? (
                            <img
                              src={v.profileImage}
                              alt={v.villageName}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                              {v.villageName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold leading-none">@{v.villageName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{v.adminName}</p>
                          </div>
                        </button>
                      ))}
                      {hashtagQuery !== null && hashtagList.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertSuggestion("#", h); }}
                          className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted rounded-xl transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-600">
                            <Hash className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-xs font-semibold">#{h}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stickers Preview - BELOW text */}
              {selectedStickers.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2 animate-in slide-in-from-top-2 duration-200 border-t border-dashed pt-4">
                  {selectedStickers.map((sticker, idx) => (
                    <div key={`${sticker.id}-${idx}`} className="relative group/sticker-preview inline-block">
                      <div className="w-20 h-20 p-2 bg-primary/5 rounded-2xl border-2 border-primary/10 shadow-sm">
                        {sticker.url ? (
                          <img src={sticker.url} alt="Stiker" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-5xl flex items-center justify-center h-full leading-none">{sticker.emoji}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedStickers(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover/sticker-preview:opacity-100 transition-all shadow-lg hover:scale-110"
                        title="Hapus Stiker"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showPoll && (
              <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4 text-primary/70" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">Polling</span>
                  </div>
                  <button onClick={() => setShowPoll(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <Input
                  placeholder="Pertanyaan polling..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="bg-background border-none focus-visible:ring-1"
                />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <Input
                      key={i}
                      placeholder={`Opsi ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      className="h-9 bg-background/50"
                    />
                  ))}
                </div>
                {pollOptions.length < 6 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-primary"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Tambah opsi
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <StickerPicker 
                  onSelect={(s) => setSelectedStickers(prev => [...prev, s])} 
                />

                <Button
                  type="button"
                  variant={showPoll ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-full hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowPoll(!showPoll)}
                  title="Buat Polling"
                >
                  <Vote className="w-5 h-5" />
                </Button>

                {/* Voice Note Trigger */}
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "ghost"}
                  size="icon"
                  className={cn("rounded-full transition-all", isRecording && "animate-pulse")}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                {isRecording && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive rounded-full">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
                    <span className="text-[10px] font-bold tabular-nums">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="rounded-full px-8 gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
                onClick={handlePost}
                disabled={loading || (!content.trim() && selectedStickers.length === 0 && media.length === 0)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Posting Diskusi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
