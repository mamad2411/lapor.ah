import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

// GET: list semua thread untuk villageId
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const threadId = searchParams.get("threadId");

    if (threadId) {
      const doc = await adminDb().collection("pesan_threads").doc(threadId).get();
      if (!doc.exists) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ thread: { id: doc.id, ...doc.data() } });
    }

    if (!villageId) return NextResponse.json({ threads: [] });

    const snap = await adminDb()
      .collection("pesan_threads")
      .where("villageId", "==", villageId)
      .get();

    const threads = snap.docs.map((d) => ({
      id: d.id,
      status: d.data().status,
      messages: d.data().messages || [],
      createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() || "",
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString?.() || "",
    }));

    // Urutkan berdasarkan updatedAt descending di memori untuk menghindari keharusan indeks komposit
    threads.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    const limitedThreads = threads.slice(0, 50);

    return NextResponse.json({ threads: limitedThreads });
  } catch (err) {
    return NextResponse.json({ threads: [] });
  }
}

// POST: admin reply ke thread
export async function POST(req: Request) {
  try {
    const { threadId, message, adminName } = await req.json();
    if (!threadId || !message) {
      return NextResponse.json({ error: "threadId dan message wajib" }, { status: 400 });
    }

    const ref = adminDb().collection("pesan_threads").doc(threadId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });

    const messages = [...(doc.data()?.messages || [])];
    messages.push({
      role: "admin",
      content: message,
      at: new Date().toISOString(),
      adminName: adminName || "Admin Desa",
    });

    await ref.update({
      messages,
      status: "admin_replied",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal balas" },
      { status: 400 }
    );
  }
}
