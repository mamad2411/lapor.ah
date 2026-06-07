export type LaporanStatus = "submitted" | "dibaca" | "diproses" | "selesai" | "ditolak";

export type KategoriLingkungan =
  | "Sampah & Pencemaran"
  | "Saluran Air & Banjir"
  | "Hutan & Lahan"
  | "Udara & Asap"
  | "Kebisingan"
  | "Satwa Liar"
  | "Infrastruktur Hijau"
  | "Lainnya";

export type TingkatUrgensi = "Darurat" | "Tinggi" | "Sedang" | "Rendah";

export interface LaporanWarga {
  id: string;
  ticketId: string;
  villageId: string;
  villageName: string;
  villageLat: string;
  villageLng: string;
  issueLat: string;
  issueLng: string;
  issueAddress: string;
  kategori: KategoriLingkungan;
  subKategori: string;
  deskripsi: string;
  dampakLingkungan: string;
  tingkatUrgensi: TingkatUrgensi;
  dusun: string;
  rt: string;
  rw: string;
  documents: string[];
  blockchainHash: string;
  blockchainPrevHash: string;
  status: LaporanStatus;
  adminRead: boolean;
  adminReadAt: string | null;
  anonymous: true;
  timeline: { status: LaporanStatus; note: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface DiskusiPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface DiskusiPoll {
  question: string;
  options: DiskusiPollOption[];
  totalVotes: number;
  endsAt?: string;
}

export interface DesaPostRating {
  score: number;
  note: string;
  ratedBy: string;
  ratedAt: string;
}

export interface DiskusiPost {
  id: string;
  authorAlias: string;
  authorRole?: "admin" | "warga";
  content: string;
  hashtags: string[];
  taggedAdmins: string[];
  villageId?: string;
  villageName: string;
  media: { 
    type: "image" | "video" | "voice"; 
    url: string; 
    bgMusic?: string;
    sticker?: string;
    textOverlay?: string;
    locationLabel?: string;
    timeLabel?: string;
  }[];
  poll?: DiskusiPoll;
  replyCount: number;
  stickerId?: string;
  stickerUrl?: string;
  stickers?: { id?: string; url?: string }[];
  adminRating?: DesaPostRating;
  likes?: number;
  comments?: number;
  shares?: number;
  createdAt: string;
}

export interface DiskusiReply {
  id: string;
  postId: string;
  parentReplyId?: string;
  authorAlias: string;
  content: string;
  stickerId?: string;
  stickerUrl?: string;
  stickers?: { id?: string; url?: string }[];
  isAdmin?: boolean;
  adminName?: string;
  createdAt: string;
}

export interface StickerItem {
  id: string;
  emoji?: string;
  url?: string;
  label: string;
  category: "reaksi" | "desa" | "alam" | "emosi" | "koleksi";
}

export interface TrendingHashtag {
  tag: string;
  count: number;
  tagline: "hot" | "popular_minggu" | "popular_bulan" | "popular_akhir";
}

export interface PesanMessage {
  role: "user" | "bot" | "admin";
  content: string;
  at: string;
  templateId?: string;
}

export interface ReplyTemplate {
  id: string;
  villageId: string;
  question: string;
  keywords: string[];
  answer: string;
  active: boolean;
}

export interface VillageOption {
  id: string;
  villageName: string;
  latitude: string;
  longitude: string;
  adminName: string;
  profileImage?: string | null;
  villageThumbnail?: string | null;
}

