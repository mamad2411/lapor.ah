import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const ratingSchema = z.object({
  postId: z.string().min(1),
  villageId: z.string().min(1),
  score: z.number().int().min(0).max(5),
  note: z.string().max(500).optional().default(""),
  ratedBy: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = ratingSchema.parse(await req.json());

    const postRef = adminDb().collection("diskusi_posts").doc(body.postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }

    const post = postDoc.data()!;
    // Allow if villageId matches OR post was tagged with this village via @mention
    const taggedAdmins: string[] = post.taggedAdmins || [];
    const villageDoc = await adminDb().collection("users").doc(body.villageId).get();
    const villageName = villageDoc.data()?.villageName || "";
    const isTagged = taggedAdmins.some((a) => a.toLowerCase() === villageName.toLowerCase());

    if (!isTagged && post.villageId !== body.villageId) {
      return NextResponse.json(
        { error: "Tanggapan hanya untuk posting yang men-tag desa ini" },
        { status: 400 }
      );
    }

    const adminRating = {
      score: body.score,
      note: body.note,
      ratedBy: body.ratedBy,
      ratedAt: FieldValue.serverTimestamp(),
    };

    const isNewRating = !postDoc.data()?.adminRating;
    await postRef.update({
      adminRating,
      ...(isNewRating ? { replyCount: FieldValue.increment(1), comments: FieldValue.increment(1) } : {}),
    });

    return NextResponse.json({ ok: true, adminRating: { ...adminRating, ratedAt: new Date().toISOString() } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan rating" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = ratingSchema.parse(await req.json());

    const postRef = adminDb().collection("diskusi_posts").doc(body.postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }
    if (!postDoc.data()?.adminRating) {
      return NextResponse.json({ error: "Tanggapan belum ada, gunakan POST" }, { status: 400 });
    }

    const adminRating = {
      score: body.score,
      note: body.note,
      ratedBy: body.ratedBy,
      ratedAt: FieldValue.serverTimestamp(),
    };

    await postRef.update({ adminRating });

    return NextResponse.json({ ok: true, adminRating: { ...adminRating, ratedAt: new Date().toISOString() } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memperbarui rating" },
      { status: 400 }
    );
  }
}
