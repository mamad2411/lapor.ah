import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { generateAnonymousAlias } from "@/lib/ticket";
import { getStickerById } from "@/lib/warga/stickers";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { DiskusiReply } from "@/lib/warga/types";

export const runtime = "nodejs";

function mapReply(doc: QueryDocumentSnapshot): DiskusiReply {
  const d = doc.data();
  return {
    id: doc.id,
    postId: d.postId,
    parentReplyId: d.parentReplyId || undefined,
    authorAlias: d.authorAlias,
    content: d.content || "",
    stickerId: d.stickerId || undefined,
    stickerUrl: d.stickerUrl || undefined,
    isAdmin: d.isAdmin || false,
    adminName: d.adminName || undefined,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const snap = await adminDb()
      .collection("diskusi_replies")
      .where("postId", "==", postId)
      .get();

    const replies = snap.docs
      .map(mapReply)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ replies });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat balasan" },
      { status: 400 }
    );
  }
}

const replySchema = z.object({
  content: z.string().optional().default(""),
  stickerId: z.string().optional(),
  stickerUrl: z.string().optional(),
  stickers: z.array(z.object({
    id: z.string().optional(),
    url: z.string().optional(),
  })).optional().default([]),
  parentReplyId: z.string().optional(),
  isAdmin: z.boolean().optional().default(false),
  adminName: z.string().optional(),
}).refine(data => {
  if (data.content.trim().length === 0 && data.stickers.length === 0 && !data.stickerId && !data.stickerUrl) {
    return false;
  }
  return true;
}, {
  message: "Tulis balasan atau pilih stiker untuk mengirim balasan",
  path: ["content"]
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const body = replySchema.parse(await req.json());

    if (!body.content.trim() && !body.stickerId && !body.stickerUrl) {
      return NextResponse.json(
        { error: "Tulis balasan atau pilih stiker" },
        { status: 400 }
      );
    }

    // Hanya validasi stickerId jika dia BUKAN custom (tidak punya stickerUrl)
    if (body.stickerId && !body.stickerUrl && !getStickerById(body.stickerId)) {
      return NextResponse.json({ error: "Stiker tidak valid" }, { status: 400 });
    }

    const postRef = adminDb().collection("diskusi_posts").doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }

    if (body.parentReplyId) {
      const parent = await adminDb().collection("diskusi_replies").doc(body.parentReplyId).get();
      if (!parent.exists || parent.data()?.postId !== postId) {
        return NextResponse.json({ error: "Balasan induk tidak valid" }, { status: 400 });
      }
    }

    const replyRef = adminDb().collection("diskusi_replies").doc();
    await replyRef.set({
      postId,
      parentReplyId: body.parentReplyId || null,
      authorAlias: body.isAdmin ? (body.adminName || "Admin Desa") : generateAnonymousAlias(),
      content: body.content.trim(),
      stickerId: body.stickerId || null,
      stickerUrl: body.stickerUrl || null,
      stickers: body.stickers || [],
      isAdmin: body.isAdmin || false,
      adminName: body.adminName || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    await postRef.update({
      replyCount: FieldValue.increment(1),
      comments: FieldValue.increment(1),
    });

    const created = await replyRef.get();
    return NextResponse.json({ ok: true, reply: mapReply(created as QueryDocumentSnapshot) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengirim balasan" },
      { status: 400 }
    );
  }
}
