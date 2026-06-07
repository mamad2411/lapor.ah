import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { mapDiskusiPost } from "@/lib/warga/diskusi-mapper";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await adminDb().collection("diskusi_posts").doc(id).get();
    if (!doc.exists || doc.data()?.deletedAt) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ post: mapDiskusiPost(doc) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat posting" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ref = adminDb().collection("diskusi_posts").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }
    if (doc.data()?.deletedAt) {
      return NextResponse.json({ ok: true });
    }

    await ref.update({ deletedAt: FieldValue.serverTimestamp() });

    // Decrement or delete mention counts
    const taggedAdmins = (doc.data()?.taggedAdmins || []) as string[];
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengarsipkan" },
      { status: 400 }
    );
  }
}
