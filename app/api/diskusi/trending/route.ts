import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import type { TrendingHashtag } from "@/lib/warga/types";

export const runtime = "nodejs";

function countHashtags(
  posts: { hashtags: string[]; createdAt: Date }[],
  sinceMs: number
): Map<string, number> {
  const counts = new Map<string, number>();
  const cutoff = Date.now() - sinceMs;

  for (const post of posts) {
    if (post.createdAt.getTime() < cutoff) continue;
    for (const tag of post.hashtags) {
      const t = tag.toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return counts;
}

export async function GET() {
  try {
    const snap = await adminDb()
      .collection("diskusi_posts")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const posts = snap.docs
      .filter((doc) => !doc.data().deletedAt)
      .map((doc) => ({
        hashtags: (doc.data().hashtags || []) as string[],
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));

    const hot = countHashtags(posts, 24 * 60 * 60 * 1000);
    const week = countHashtags(posts, 7 * 24 * 60 * 60 * 1000);
    const month = countHashtags(posts, 30 * 24 * 60 * 60 * 1000);

    const toSorted = (map: Map<string, number>, tagline: TrendingHashtag["tagline"]) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count, tagline }));

    const trending: TrendingHashtag[] = [
      ...toSorted(hot, "hot"),
      ...toSorted(week, "popular_minggu"),
      ...toSorted(month, "popular_bulan"),
    ];

    const unique = new Map<string, TrendingHashtag>();
    for (const t of trending) {
      if (!unique.has(t.tag)) unique.set(t.tag, t);
    }

    return NextResponse.json({ trending: [...unique.values()] });
  } catch (err) {
    return NextResponse.json({ trending: [] });
  }
}

export async function GET_VILLAGE_TRENDS() {
  // Placeholder — see /api/diskusi/village-trends
}
