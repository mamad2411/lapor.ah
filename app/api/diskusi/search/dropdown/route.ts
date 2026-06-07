import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Ambil hashtag trending
    const trendingSnap = await adminDb().collection("diskusi_trending").orderBy("score", "desc").limit(5).get();
    const hashtags = trendingSnap.docs.map(d => d.id);

    // Ambil beberapa postingan terbaru
    const postSnap = await adminDb().collection("diskusi_posts").orderBy("createdAt", "desc").limit(5).get();
    const recentPosts = postSnap.docs.map(d => ({
      id: d.id,
      content: d.data().content?.slice(0, 40) + "...",
      author: d.data().authorAlias
    }));

    // Ambil data desa
    const villageSnap = await adminDb().collection("users").where("roles", "==", "ADMIN").limit(5).get();
    const villages = villageSnap.docs.map(d => d.data().villageName);

    return NextResponse.json({
      hashtags,
      recentPosts,
      villages
    });
  } catch (err) {
    return NextResponse.json({ hashtags: [], recentPosts: [], villages: [] });
  }
}
