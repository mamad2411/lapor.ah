import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireOpsSession(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending_superadmin";

    const snap = await adminDb()
      .collection("pending_registrations")
      .where("status", "==", status)
      .get();

    const registrations = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          nik: d.nik,
          villageName: d.villageName,
          latitude: d.latitude,
          longitude: d.longitude,
          position: d.position,
          status: d.status,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
          rejectedReason: d.rejectedReason || null,
          rejectionToken: d.rejectionToken || null,
          rejectionUrl: d.rejectionUrl || null,
          profileImage: d.profileImage || null,
          documentValid: d.documentVerification?.valid ?? null,
          documentScore: d.documentVerification?.score ?? null,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ registrations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
