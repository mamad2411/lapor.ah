export type StatusLaporan =
  | "Belum di Proses"
  | "Sedang di Proses"
  | "Selesai"
  | "Ditolak";

export type PrioritasLaporan = "Darurat" | "Tinggi" | "Sedang" | "Rendah";

export type KategoriLaporan =
  | "Infrastruktur Jalan"
  | "Saluran Air"
  | "Sampah & Kebersihan"
  | "Penerangan Jalan"
  | "Keamanan"
  | "Pelayanan Publik"
  | "Bantuan Sosial"
  | "Lainnya";

export interface Tanggapan {
  id: string;
  isi: string;
  status: StatusLaporan;
  petugas: string;
  createdAt: string;
}

export interface Laporan {
  id: string;
  nomor: string;
  judul: string;
  deskripsi: string;
  kategori: KategoriLaporan;
  status: StatusLaporan;
  prioritas: PrioritasLaporan;
  dusun: string;
  rt: string;
  rw: string;
  pelapor: {
    nama: string;
    nik: string;
    telepon: string;
  };
  foto?: string;
  lokasi?: string;
  createdAt: string;
  updatedAt: string;
  tanggapan?: Tanggapan;
  petugas?: string;
  subKategori?: string;
}

export interface Warga {
  id: string;
  nama: string;
  nik: string;
  telepon: string;
  dusun: string;
  rt: string;
  rw: string;
  totalLaporan: number;
  terakhirAktif: string;
}

export interface Notifikasi {
  id: string;
  jenis: "baru" | "darurat" | "tenggat" | "umpan_balik" | "status";
  judul: string;
  pesan: string;
  laporanId?: string;
  dibaca: boolean;
  createdAt: string;
}

export interface StatistikWilayah {
  dusun: string;
  total: number;
  belum: number;
  proses: number;
  selesai: number;
}

export interface StatistikBulanan {
  bulan: string;
  masuk: number;
  selesai: number;
}
