"use client";

import { useEffect, useState, useRef } from "react";
import { Smile, Plus, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STICKER_LIBRARY, getStickerById } from "@/lib/warga/stickers";
import type { StickerItem } from "@/lib/warga/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "koleksi", label: "Koleksi Stiker Saya" },
] as const;

interface StickerPickerProps {
  onSelect: (sticker: StickerItem) => void;
  selectedId?: string;
  size?: "sm" | "default";
}

export function StickerPicker({ onSelect, selectedId, size = "default" }: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<StickerItem["category"]>("koleksi");
  const [savedStickers, setSavedStickers] = useState<StickerItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("my_stickers");
    if (saved) {
      try {
        setSavedStickers(JSON.parse(saved));
      } catch (e) {
        setSavedStickers([]);
      }
    }
  }, []);

  const saveToLocalStorage = (list: StickerItem[]) => {
    setSavedStickers(list);
    localStorage.setItem("my_stickers", JSON.stringify(list));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", "stickers");

    try {
      const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newSticker: StickerItem = {
        id: `custom-${Date.now()}`,
        url: data.url,
        label: "Stiker Saya",
        category: "koleksi",
      };

      const updated = [newSticker, ...savedStickers];
      saveToLocalStorage(updated);
      setCategory("koleksi");
      toast.success("Stiker berhasil diunggah ke koleksi!");
    } catch (err) {
      toast.error("Gagal unggah stiker");
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (sticker: StickerItem) => {
    onSelect(sticker);
    setOpen(false);
  };

  const currentStickers = savedStickers;

  const selectedSticker = selectedId 
    ? (savedStickers.find(s => s.id === selectedId) || getStickerById(selectedId))
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          className={cn("gap-1.5 h-10 px-3 rounded-xl transition-all", selectedId && "border-primary bg-primary/5 shadow-sm")}
        >
          <Smile className={cn("w-4 h-4", selectedId ? "text-primary" : "text-muted-foreground")} />
          {selectedSticker ? (
            <div className="w-6 h-6 flex items-center justify-center overflow-hidden animate-in zoom-in-50 duration-200">
              {selectedSticker.url ? (
                <img src={selectedSticker.url} alt={selectedSticker.label} className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg leading-none">{selectedSticker.emoji}</span>
              )}
            </div>
          ) : (
            <span className="text-xs font-bold uppercase tracking-tight">Stiker</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-primary/10 overflow-hidden" align="start">
        <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">Koleksi Stiker Saya</span>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 rounded-xl h-14 text-xs font-bold uppercase tracking-wider gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Unggah Stiker Baru
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {currentStickers.length > 0 ? (
              currentStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  title={sticker.label}
                  onClick={() => handleSelect(sticker)}
                  className={cn(
                    "aspect-square p-2 rounded-2xl hover:bg-primary/5 transition-all relative group flex items-center justify-center border-2 border-transparent",
                    selectedId === sticker.id ? "bg-primary/10 border-primary/40 shadow-inner" : "hover:border-primary/10"
                  )}
                >
                  {sticker.url ? (
                    <img src={sticker.url} alt={sticker.label} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-3xl">{sticker.emoji}</span>
                  )}
                </button>
              ))
            ) : (
              <div className="col-span-4 py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                  <Smile className="w-8 h-8 text-primary/30" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Koleksi Kosong</p>
                  <p className="text-[9px] text-muted-foreground/60 px-6">Unggah gambar atau simpan stiker dari warga lain</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
