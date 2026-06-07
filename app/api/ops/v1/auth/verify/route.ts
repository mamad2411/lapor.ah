import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await requireOpsSession(req);
    const userDoc = await adminDb().collection("users").doc(session.uid).get();

    const [pendingSnap, postsSnap, threadsSnap, adminsSnap] = await Promise.all([
      adminDb().collection("pending_registrations").where("status", "==", "pending_superadmin").get(),
      adminDb().collection("diskusi_posts").limit(500).get(),
      adminDb().collection("pesan_threads").limit(200).get(),
      adminDb().collection("users").where("roles", "==", "ADMIN").get(),
    ]);

    const postCount = postsSnap.docs.filter((d) => !d.data().deletedAt).length;
    const activeAdmins = adminsSnap.docs.filter((d) => d.data().status !== "deleted").length;

    // Trend data: hitung diskusi & pesan per 6 bulan terakhir
    const now = new Date();
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        bulan: d.toLocaleDateString("id-ID", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth(),
        diskusi: 0,
        pesan: 0,
      };
    });

    for (const doc of postsSnap.docs) {
      if (doc.data().deletedAt) continue;
      const ts: Date = doc.data().createdAt?.toDate?.() || new Date(0);
      const slot = trendData.find((t) => t.year === ts.getFullYear() && t.month === ts.getMonth());
      if (slot) slot.diskusi++;
    }
    for (const doc of threadsSnap.docs) {
      const ts: Date = doc.data().createdAt?.toDate?.() || new Date(0);
      const slot = trendData.find((t) => t.year === ts.getFullYear() && t.month === ts.getMonth());
      if (slot) slot.pesan++;
    }

    return NextResponse.json({
      ok: true,
      gate: session.nonce,
      email: session.email,
      name: userDoc.data()?.name || "Superadmin",
      stats: {
        pendingRegistrations: pendingSnap.size,
        diskusiPosts: postCount,
        pesanThreads: threadsSnap.size,
        activeAdmins,
      },
      trendData: trendData.map(({ bulan, diskusi, pesan }) => ({ bulan, diskusi, pesan })),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
