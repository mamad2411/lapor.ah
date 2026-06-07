import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireOpsSession(req);
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const status = searchParams.get("status");

    const snap = await adminDb().collection("pesan_threads").limit(200).get();

    let threads = snap.docs.map((doc) => {
      const d = doc.data();
      const messages = (d.messages || []) as {
        role: string;
        content: string;
        at: string;
        templateId?: string;
      }[];
      return {
        id: doc.id,
        villageId: d.villageId,
        villageName: d.villageName,
        status: d.status,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.slice(0, 120) || "",
        lastRole: messages[messages.length - 1]?.role || "",
        messages,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
        updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || "",
      };
    });

    if (villageId) threads = threads.filter((t) => t.villageId === villageId);
    if (status) threads = threads.filter((t) => t.status === status);

    threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ threads: threads.slice(0, 150) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: err instanceof Error && err.message === "Unauthorized" ? 401 : 400 }
    );
  }
}
