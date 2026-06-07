import type { StickerItem } from "./types";

export const STICKER_LIBRARY: StickerItem[] = [
  // Image Stickers
  { id: "s-ok", url: "https://api.dicebear.com/7.x/bottts/svg?seed=ok", label: "Siap", category: "reaksi" },
  { id: "s-love", url: "https://api.dicebear.com/7.x/bottts/svg?seed=love", label: "Cinta", category: "reaksi" },
  { id: "s-cool", url: "https://api.dicebear.com/7.x/bottts/svg?seed=cool", label: "Keren", category: "reaksi" },
  { id: "s-happy", url: "https://api.dicebear.com/7.x/bottts/svg?seed=happy", label: "Senang", category: "emosi" },
  { id: "s-sad", url: "https://api.dicebear.com/7.x/bottts/svg?seed=sad", label: "Sedih", category: "emosi" },
  { id: "s-village", url: "https://api.dicebear.com/7.x/shapes/svg?seed=village", label: "Desa Kita", category: "desa" },
  { id: "s-clean", url: "https://api.dicebear.com/7.x/shapes/svg?seed=clean", label: "Bersih", category: "desa" },
  
  // Emoji Stickers (Legacy support)
  { id: "thumbs-up", emoji: "👍", label: "Setuju", category: "reaksi" },
  { id: "clap", emoji: "👏", label: "Tepuk", category: "reaksi" },
  { id: "fire", emoji: "🔥", label: "Mantap", category: "reaksi" },
  { id: "100", emoji: "💯", label: "100%", category: "reaksi" },
  { id: "pray", emoji: "🙏", label: "Amin", category: "reaksi" },
  { id: "eyes", emoji: "👀", label: "Perhatian", category: "reaksi" },
  { id: "thinking", emoji: "🤔", label: "Berpikir", category: "emosi" },
  { id: "sad", emoji: "😢", label: "Sedih", category: "emosi" },
  { id: "angry", emoji: "😠", label: "Marah", category: "emosi" },
  { id: "laugh", emoji: "😂", label: "Ngakak", category: "emosi" },
  { id: "shock", emoji: "😱", label: "Kaget", category: "emosi" },
  { id: "love", emoji: "❤️", label: "Sayang", category: "emosi" },
  { id: "house", emoji: "🏠", label: "Rumah", category: "desa" },
  { id: "village", emoji: "🏘️", label: "Desa", category: "desa" },
  { id: "road", emoji: "🛣️", label: "Jalan", category: "desa" },
  { id: "bridge", emoji: "🌉", label: "Jembatan", category: "desa" },
  { id: "water", emoji: "💧", label: "Air", category: "alam" },
  { id: "trash", emoji: "🗑️", label: "Sampah", category: "alam" },
  { id: "tree", emoji: "🌳", label: "Pohon", category: "alam" },
  { id: "flood", emoji: "🌊", label: "Banjir", category: "alam" },
  { id: "smoke", emoji: "💨", label: "Asap", category: "alam" },
  { id: "sun", emoji: "☀️", label: "Cerah", category: "alam" },
  { id: "rain", emoji: "🌧️", label: "Hujan", category: "alam" },
  { id: "megaphone", emoji: "📢", label: "Suarakan", category: "reaksi" },
];

export function getStickerById(id: string): StickerItem | undefined {
  return STICKER_LIBRARY.find((s) => s.id === id);
}
