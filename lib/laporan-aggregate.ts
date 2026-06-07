import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

export interface RawLaporan {
  id: string;
  ticketId: string;
  villageId: string;
  villageName: string;
  villageLat?: string;
  villageLng?: string;
  issueLat?: string;
  issueLng?: string;
  issueAddress?: string;
  kategori: string;
  subKategori?: string;
  deskripsi: string;
  tingkatUrgensi: string;
  status: string;
  dusun?: string;
  rt?: string;
  rw?: string;
  pelapor?: {
    nama: string;
    nik: string;
    telepon: string;
  };
  createdAt: string;
  timeline?: { status: string; at: string }[];
}

export function wilayahKey(rt?: string, rw?: string) {
  const rtVal = (rt || "").trim();
  const rwVal = (rw || "").trim();
  if (rtVal && rwVal) return `RT ${rtVal} / RW ${rwVal}`;
  if (rwVal) return `RW ${rwVal}`;
  if (rtVal) return `RT ${rtVal}`;
  return "Wilayah tidak diketahui";
}

export function isBelum(status: string) {
  return status === "submitted" || status === "dibaca";
}

export function isProses(status: string) {
  return status === "diproses";
}

export function isSelesai(status: string) {
  return status === "selesai";
}

export function aggregateWilayah(laporan: RawLaporan[]) {
  const map = new Map<
    string,
    {
      key: string;
      label: string;
      total: number;
      belum: number;
      proses: number;
      selesai: number;
      laporan: RawLaporan[];
    }
  >();

  for (const item of laporan) {
    const key = wilayahKey(item.rt, item.rw);
    if (!map.has(key)) {
      map.set(key, { key, label: key, total: 0, belum: 0, proses: 0, selesai: 0, laporan: [] });
    }
    const row = map.get(key)!;
    row.total++;
    if (isBelum(item.status)) row.belum++;
    else if (isProses(item.status)) row.proses++;
    else if (isSelesai(item.status)) row.selesai++;
    row.laporan.push(item);
  }

  return [...map.values()]
    .map((w) => ({
      ...w,
      laporan: w.laporan
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map((l) => ({
          id: l.id,
          ticketId: l.ticketId,
          kategori: l.kategori,
          deskripsi: l.deskripsi.slice(0, 120),
          status: l.status,
          tingkatUrgensi: l.tingkatUrgensi,
          issueLat: l.issueLat || "",
          issueLng: l.issueLng || "",
          issueAddress: l.issueAddress || "",
          createdAt: l.createdAt,
        })),
    }))
    .sort((a, b) => b.total - a.total);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function aggregateBulanan(laporan: RawLaporan[], months = 6) {
  const now = new Date();
  const buckets: { bulan: string; masuk: number; selesai: number; key: string }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ bulan: MONTH_LABELS[d.getMonth()], masuk: 0, selesai: 0, key });
  }

  let selesaiCount = 0;
  let totalHours = 0;
  let completedWithTime = 0;

  for (const item of laporan) {
    if (isSelesai(item.status)) selesaiCount++;

    const created = item.createdAt ? new Date(item.createdAt) : null;
    if (created) {
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.masuk++;
    }

    const doneEntry = (item.timeline || []).find((t) => t.status === "selesai");
    if (doneEntry?.at && created) {
      const done = new Date(doneEntry.at);
      const key = `${done.getFullYear()}-${String(done.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.selesai++;
      const hours = (done.getTime() - created.getTime()) / (1000 * 60 * 60);
      if (hours >= 0) {
        totalHours += hours;
        completedWithTime++;
      }
    }
  }

  const total = laporan.length;
  const rataRataJam =
    completedWithTime > 0 ? Math.round(totalHours / completedWithTime) : 0;

  return {
    totalLaporan: total,
    selesai: selesaiCount,
    persentase: total > 0 ? Math.round((selesaiCount / total) * 100) : 0,
    rataRataJam,
    trend: buckets.map(({ bulan, masuk, selesai }) => ({ bulan, masuk, selesai })),
    preview: [...laporan]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((l) => ({
        id: l.id,
        nomor: l.ticketId,
        judul: l.kategori,
        deskripsi: l.deskripsi,
        kategori: l.kategori,
        status: l.status,
        prioritas: l.tingkatUrgensi,
        dusun: l.dusun || "Desa",
        rt: l.rt || "0",
        rw: l.rw || "0",
        pelapor: l.pelapor || { nama: "Warga", nik: "", telepon: "" },
        createdAt: l.createdAt,
      })),
  };
}

export function aggregateRingkasan(laporan: RawLaporan[]) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  let baruHariIni = 0;
  let menunggu = 0;
  let sedangProses = 0;
  let selesaiMinggu = 0;
  let darurat = 0;
  let totalAktif = 0;

  for (const item of laporan) {
    const created = new Date(item.createdAt);

    // Laporan baru hari ini
    if (created >= startOfDay) baruHariIni++;

    // Menunggu tindak lanjut (submitted/dibaca)
    if (isBelum(item.status)) menunggu++;

    // Sedang diproses
    if (isProses(item.status)) sedangProses++;

    // Selesai minggu ini
    if (isSelesai(item.status)) {
      const doneEntry = (item.timeline || []).find((t) => t.status === "selesai");
      const doneAt = doneEntry?.at ? new Date(doneEntry.at) : null;
      if (doneAt && doneAt >= startOfWeek) selesaiMinggu++;
    }

    // Laporan darurat aktif (darurat && !selesai)
    const urgensi = (item.tingkatUrgensi || "").toLowerCase();
    if (urgensi === "darurat" && !isSelesai(item.status)) darurat++;

    // Total laporan aktif (anything but selesai)
    if (!isSelesai(item.status)) totalAktif++;
  }

  return {
    baruHariIni,
    menunggu,
    sedangProses,
    selesaiMinggu,
    darurat,
    total: totalAktif,
  };
}

export function aggregateRingkasanForRange(laporan: RawLaporan[], range: 'hari' | 'minggu' | 'bulan' | 'tahun' | 'semua') {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const isInRange = (date: Date) => {
    if (range === 'semua') return true;
    if (range === 'hari') return date >= startOfToday;
    if (range === 'minggu') return date >= startOfWeek;
    if (range === 'bulan') return date >= startOfMonth;
    if (range === 'tahun') return date >= startOfYear;
    return false;
  };

  let baru = 0;
  let menunggu = 0;
  let sedangProses = 0;
  let selesai = 0;
  let darurat = 0;
  let totalAktif = 0;

  for (const item of laporan) {
    const created = new Date(item.createdAt);
    const isCreatedInRange = isInRange(created);

    // Laporan baru in range (created in range)
    if (isCreatedInRange) {
      baru++;
    }

    // Menunggu tindak lanjut (submitted/dibaca) in range
    if (isBelum(item.status) && isCreatedInRange) {
      menunggu++;
    }

    // Sedang diproses in range
    if (isProses(item.status) && isCreatedInRange) {
      sedangProses++;
    }

    // Selesai in range (based on completion date)
    if (isSelesai(item.status)) {
      const doneEntry = (item.timeline || []).find((t) => t.status === "selesai");
      const doneAt = doneEntry?.at ? new Date(doneEntry.at) : null;
      if (doneAt && isInRange(doneAt)) {
        selesai++;
      }
    }

    // Laporan darurat aktif (darurat && !selesai) in range
    const urgensi = (item.tingkatUrgensi || "").toLowerCase();
    if (urgensi === "darurat" && !isSelesai(item.status) && isCreatedInRange) {
      darurat++;
    }

    // Total laporan aktif (anything but selesai) in range
    if (!isSelesai(item.status) && isCreatedInRange) {
      totalAktif++;
    }
  }

  return {
    baru,
    menunggu,
    sedangProses,
    selesai,
    darurat,
    total: totalAktif,
  };
}


export function mapFirestoreLaporan(doc: QueryDocumentSnapshot): RawLaporan {
  const d = doc.data();
  return {
    id: doc.id,
    ticketId: String(d.ticketId || ""),
    villageId: String(d.villageId || ""),
    villageName: String(d.villageName || ""),
    villageLat: String(d.villageLat || ""),
    villageLng: String(d.villageLng || ""),
    issueLat: String(d.issueLat || ""),
    issueLng: String(d.issueLng || ""),
    issueAddress: String(d.issueAddress || ""),
    kategori: String(d.kategori || d.kategoriAsli || ""),
    subKategori: String(d.subKategori || ""),
    deskripsi: String(d.deskripsi || ""),
    tingkatUrgensi: String(d.tingkatUrgensi || ""),
    status: String(d.status || "submitted"),
    dusun: String(d.dusun || ""),
    rt: String(d.rt || ""),
    rw: String(d.rw || ""),
    pelapor: d.pelapor
      ? {
          nama: String(d.pelapor.nama || "Warga"),
          nik: String(d.pelapor.nik || ""),
          telepon: String(d.pelapor.telepon || ""),
        }
      : undefined,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
    timeline: (d.timeline as { status: string; at: string }[]) || [],
  };
}

export async function fetchVillageLaporan(villageId: string) {
  const { adminDb } = await import("@/lib/firebase/admin");
  const snap = await adminDb()
    .collection("laporan")
    .where("villageId", "==", villageId)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get()
    .catch(async () => {
      const fallback = await adminDb().collection("laporan").orderBy("createdAt", "desc").limit(500).get();
      return {
        docs: fallback.docs.filter((d) => d.data().villageId === villageId),
      } as typeof fallback;
    });

  return snap.docs.map(mapFirestoreLaporan);
}
