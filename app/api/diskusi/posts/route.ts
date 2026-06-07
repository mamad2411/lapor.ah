import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { generateAnonymousAlias } from "@/lib/ticket";
import { notifyAdmin } from "@/lib/notify-admin";
import { mapDiskusiPost } from "@/lib/warga/diskusi-mapper";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hashtag = searchParams.get("hashtag");
    const villageId = searchParams.get("villageId");
    const villageName = (searchParams.get("villageName") || "").toLowerCase().trim();
    const search = (searchParams.get("search") || "").toLowerCase().trim();
    const sort = searchParams.get("sort") || "foryou";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const snap = await adminDb()
      .collection("diskusi_posts")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    let posts = snap.docs
      .filter((doc) => !doc.data().deletedAt)
      .map(mapDiskusiPost);

    if (hashtag) {
      const tag = hashtag.replace(/^#/, "").toLowerCase();
      posts = posts.filter((p) => p.hashtags.some((h) => h.toLowerCase() === tag));
    }

    if (villageId || villageName) {
      posts = posts.filter((p) =>
        (villageId && p.villageId === villageId) ||
        (villageName && (
          p.villageName.toLowerCase() === villageName ||
          p.taggedAdmins?.some((a) => a.toLowerCase() === villageName)
        ))
      );
    }

    if (search) {
      posts = posts.filter(
        (p) =>
          p.content.toLowerCase().includes(search) ||
          p.hashtags.some((h) => h.toLowerCase().includes(search)) ||
          p.villageName.toLowerCase().includes(search)
      );
    }

    if (sort === "foryou") {
      posts.sort((a, b) => {
        const getScore = (p: typeof a) => {
          let s = 0;
          // Engagement score
          s += (p.likes || 0) * 2;
          s += (p.replyCount || 0) * 5;
          s += (p.comments || 0) * 3;
          s += (p.shares || 0) * 4;
          s += (p.poll?.totalVotes || 0) * 1.5;

          // Rich Media boost
          if (p.media && p.media.length > 0) s += 10;
          if (p.stickers && p.stickers.length > 0) s += 5;

          // Time decay & Recency bonus
          const createdAtTime = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
          const ageHours = (Date.now() - createdAtTime) / (1000 * 60 * 60);
          const recencyBonus = Math.max(0, 50 - ageHours);
          s += recencyBonus;

          // Deterministic shuffle seed based on post id + time block (to keep feed dynamic but stable)
          const dateSeed = Math.floor(Date.now() / 60000); // changes every minute
          let hash = 0;
          const str = (p.id || "") + dateSeed;
          for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
          }
          const jitter = Math.abs(hash % 20); // 0 to 20 points of random variance
          s += jitter;

          return s;
        };
        return getScore(b) - getScore(a);
      });
    } else if (sort === "replies") {
      posts.sort((a, b) => b.replyCount - a.replyCount);
    } else if (sort === "poll") {
      posts.sort((a, b) => (b.poll?.totalVotes || 0) - (a.poll?.totalVotes || 0));
    }

    return NextResponse.json({ posts: posts.slice(0, limit) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat diskusi" },
      { status: 400 }
    );
  }
}

const pollSchema = z.object({
  question: z.string().min(5, "Pertanyaan polling minimal 5 karakter").max(200, "Pertanyaan polling maksimal 200 karakter"),
  options: z.array(z.string().min(1, "Opsi polling tidak boleh kosong").max(80, "Opsi polling maksimal 80 karakter")).min(2, "Minimal harus ada 2 opsi polling").max(4, "Maksimal 4 opsi polling"),
  durationDays: z.number().int().min(1).max(30).optional(),
});

      const postSchema = z.object({
  content: z.string().default(""),
  hashtags: z.array(z.string()).optional().default([]),
  taggedAdmins: z.array(z.string()).optional().default([]),
  villageName: z.string().optional().default(""),
  villageId: z.string().optional(),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video", "voice"]),
        url: z.string(),
        bgMusic: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  poll: pollSchema.optional(),
  stickerId: z.string().optional(),
  stickerUrl: z.string().optional(),
  stickers: z.array(z.object({
    id: z.string().optional(),
    url: z.string().optional(),
  })).optional().default([]),
}).refine(data => {
  const hasSticker = data.stickers.length > 0 || !!data.stickerId || !!data.stickerUrl;
  const hasMedia = (data.media?.length ?? 0) > 0;
  // Kalau ada stiker atau media, content boleh kosong
  if (hasSticker || hasMedia) return true;
  // Kalau tidak ada stiker/media, content wajib minimal 5 karakter
  if (data.content.trim().length === 0) return false;
  if (data.content.trim().length < 5) return false;
  return true;
}, {
  message: "Tulis sesuatu minimal 5 karakter, atau pilih stiker/media",
  path: ["content"]
});

export async function POST(req: Request) {
  try {
    const body = postSchema.parse(await req.json());
    const hashtags = body.hashtags.map((h) => h.replace(/^#/, "").toLowerCase());

    // Gunakan taggedAdmins dari body (sudah exact-match dari frontend)
    // Fallback: cari nama desa yang ada di content via lookup Firestore
    let taggedAdmins = body.taggedAdmins;
    if (taggedAdmins.length === 0) {
      const villagesSnap = await adminDb().collection("users").where("roles", "==", "ADMIN").get();
      taggedAdmins = villagesSnap.docs
        .map((d) => d.data().villageName as string)
        .filter((name) => name && body.content.toLowerCase().includes(`@${name.toLowerCase()}`));
    }

    // Hitung mention count per village name untuk trending
    const tagMentionCounts: Record<string, number> = {};
    for (const name of taggedAdmins) {
      tagMentionCounts[name] = (tagMentionCounts[name] || 0) + 1;
    }

    const poll = body.poll
      ? {
          question: body.poll.question,
          options: body.poll.options.map((text) => ({
            id: randomBytes(4).toString("hex"),
            text,
            votes: 0,
          })),
          totalVotes: 0,
          endsAt: body.poll.durationDays
            ? new Date(Date.now() + body.poll.durationDays * 24 * 60 * 60 * 1000)
            : null,
        }
      : null;

    const docRef = adminDb().collection("diskusi_posts").doc();
    await docRef.set({
      authorAlias: generateAnonymousAlias(),
      content: body.content,
      hashtags,
      taggedAdmins,
      villageName: body.villageName,
      villageId: body.villageId || null,
      media: body.media,
      poll,
      stickerId: body.stickerId || null,
      stickerUrl: body.stickerUrl || null,
      stickers: body.stickers || [],
      replyCount: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update mention count di koleksi village_mention_counts untuk trending
    const db = adminDb();
    for (const name of taggedAdmins) {
      const slug = name.toLowerCase().replace(/\s+/g, "_");
      await db.collection("village_mention_counts").doc(slug).set(
        { villageName: name, count: FieldValue.increment(1), lastMentionAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    if (body.villageId) {
      await notifyAdmin({
        villageId: body.villageId,
        type: "diskusi",
        title: "Posting Diskusi Baru",
        message: `${hashtags.map((h) => `#${h}`).join(" ")} — ${body.content.slice(0, 100)}`,
        refId: docRef.id,
      });
    }

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal posting" },
      { status: 400 }
    );
  }
}
