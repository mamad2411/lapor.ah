import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { logOpsAudit } from "@/lib/superadmin/auth";

export const runtime = "nodejs";

const schema = z.object({
  reason: z.string().min(5),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOpsSession(req);
    const { id } = await params;
    const body = schema.parse(await req.json());

    const postRef = adminDb().collection("diskusi_posts").doc(id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }
    if (postDoc.data()?.deletedAt) {
      return NextResponse.json({ ok: true });
    }

    await postRef.update({
      deletedAt: FieldValue.serverTimestamp(),
      deleteReason: body.reason,
      deletedBy: session.email,
    });

    // Decrement or delete mention counts
    const taggedAdmins = (postDoc.data()?.taggedAdmins || []) as string[];
    const db = adminDb();
    for (const name of taggedAdmins) {
      const slug = name.toLowerCase().replace(/\s+/g, "_");
      const mRef = db.collection("village_mention_counts").doc(slug);
      const snap = await mRef.get();
      if (snap.exists) {
        const currentCount = snap.data()?.count || 0;
        if (currentCount <= 1) {
          await mRef.delete();
        } else {
          await mRef.update({ count: FieldValue.increment(-1) });
        }
      }
    }

    const repliesSnap = await adminDb()
      .collection("diskusi_replies")
      .where("postId", "==", id)
      .get();

    const batch = adminDb().batch();
    for (const reply of repliesSnap.docs) {
      batch.update(reply.ref, {
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: session.email,
      });
    }
    if (!repliesSnap.empty) await batch.commit();

    await logOpsAudit({
      action: "delete_diskusi_post",
      actorUid: session.uid,
      actorEmail: session.email,
      targetType: "diskusi_post",
      targetId: id,
      details: { reason: body.reason, repliesRemoved: repliesSnap.size },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 400 });
  }
}
