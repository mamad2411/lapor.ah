import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb } from "@/lib/firebase/admin";
import { mapDiskusiPost } from "@/lib/warga/diskusi-mapper";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireOpsSession(req);
    const { searchParams } = new URL(req.url);
    const includeDeleted = searchParams.get("includeDeleted") === "1";

    const snap = await adminDb()
      .collection("diskusi_posts")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    let posts = snap.docs.map((doc) => {
      const post = mapDiskusiPost(doc);
      const d = doc.data();
      return {
        ...post,
        deletedAt: d.deletedAt?.toDate?.()?.toISOString?.() || null,
        deleteReason: d.deleteReason || null,
        deletedBy: d.deletedBy || null,
      };
    });

    if (!includeDeleted) {
      posts = posts.filter((p) => !p.deletedAt);
    }

    return NextResponse.json({ posts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
