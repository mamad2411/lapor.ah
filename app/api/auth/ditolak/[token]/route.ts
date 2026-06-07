import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const snap = await adminDb()
      .collection("pending_registrations")
      .where("rejectionToken", "==", token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Token penolakan tidak valid" }, { status: 404 });
    }

    const doc = snap.docs[0];
    const d = doc.data();

    return NextResponse.json({
      villageName: d.villageName,
      name: d.name,
      reason: d.rejectedReason,
      rejectedAt: d.rejectedAt?.toDate?.()?.toISOString?.() || "",
      rejectionToken: d.rejectionToken,
      status: d.status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat" },
      { status: 400 }
    );
  }
}
