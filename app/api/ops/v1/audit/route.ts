import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireOpsSession(req);

    const snap = await adminDb()
      .collection("ops_audit_log")
      .orderBy("at", "desc")
      .limit(80)
      .get();

    const logs = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        action: d.action,
        actorEmail: d.actorEmail,
        targetType: d.targetType,
        targetId: d.targetId,
        details: d.details || {},
        at: d.at?.toDate?.()?.toISOString?.() || "",
      };
    });

    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
