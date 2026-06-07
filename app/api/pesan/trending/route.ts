import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * GET /api/pesan/trending?villageId=xxx
 *
 * Mengembalikan top-10 pesan/pertanyaan yang paling sering dikirim
 * warga ke desa tertentu. Dihitung dari koleksi `pesan_trends` yang
 * di-increment setiap kali ada pesan masuk ke desa tsb.
 *
 * Struktur dokumen `pesan_trends/{villageId}__{normalizedText}`:
 *   villageId: string
 *   text: string          — teks pertanyaan asli (dari pesan pertama/pendek)
 *   count: number         — berapa kali pertanyaan ini muncul
 *   lastAt: Timestamp
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");

    if (!villageId) {
      return NextResponse.json({ trending: [] });
    }

    const snap = await adminDb()
      .collection("pesan_trends")
      .where("villageId", "==", villageId)
      .get();

    const trending = snap.docs.map((d) => ({
      text: d.data().text as string,
      count: (d.data().count as number) || 0,
    }));

    // Urutkan berdasarkan count descending di memori
    trending.sort((a, b) => b.count - a.count);

    // Ambil top-10 dan map dengan rank
    const limitedTrending = trending.slice(0, 10).map((item, i) => ({
      rank: i + 1,
      text: item.text,
      count: item.count,
    }));

    return NextResponse.json({ trending: limitedTrending });
  } catch {
    return NextResponse.json({ trending: [] });
  }
}
