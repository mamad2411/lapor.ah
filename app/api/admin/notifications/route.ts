import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");

    let query = adminDb()
      .collection("admin_notifications")
      .orderBy("createdAt", "desc")
      .limit(50);

    const snap = await query.get();

    let notifications = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        type: d.type,
        title: d.title,
        message: d.message,
        refId: d.refId,
        read: d.read,
        villageId: d.villageId,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
      };
    });

    if (villageId) {
      notifications = notifications.filter((n) => n.villageId === villageId);
    }

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

    await adminDb().collection("admin_notifications").doc(id).update({
      read: true,
      readAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal update" },
      { status: 400 }
    );
  }
}
