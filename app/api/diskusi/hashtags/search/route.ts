import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").replace(/^#/, "").toLowerCase().trim();

    const snap = await adminDb()
      .collection("diskusi_posts")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const counts = new Map<string, number>();
    for (const doc of snap.docs) {
      if (doc.data().deletedAt) continue;
      for (const tag of (doc.data().hashtags || []) as string[]) {
        const t = tag.toLowerCase();
        if (!q || t.includes(q)) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }
    }

    const hashtags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({ hashtags });
  } catch {
    return NextResponse.json({ hashtags: [] });
  }
}
