import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const registrationId = searchParams.get("id");

    if (!registrationId) {
      return NextResponse.json({ error: "ID pendaftaran wajib" }, { status: 400 });
    }

    const doc = await adminDb().collection("pending_registrations").doc(registrationId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }

    const data = doc.data()!;
    const createdAt = data.createdAt?.toDate?.() ?? new Date(data.submittedAt || Date.now());
    const estimatedApproval = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    return NextResponse.json({
      status: data.status,
      villageName: data.villageName,
      email: data.email,
      estimatedApproval: estimatedApproval.toISOString(),
      adminToken: data.status === "approved" ? data.adminToken : undefined,
      finalAccessToken: data.status === "approved" ? data.finalAccessToken : undefined,
      adminUrl: data.status === "approved" ? data.adminUrl : undefined,
      uid: data.status === "approved" ? data.uid : undefined,
      rejectedReason: data.status === "rejected" ? data.rejectedReason : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat status" },
      { status: 400 }
    );
  }
}
