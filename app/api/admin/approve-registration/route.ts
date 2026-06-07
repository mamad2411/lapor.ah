import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { completeRegistration } from "@/lib/complete-registration";
import { requireOpsSession } from "@/lib/superadmin/session";

export const runtime = "nodejs";

const schema = z.object({
  registrationId: z.string().min(8),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

async function assertSuperadminAuth(req: Request) {
  try {
    await requireOpsSession(req);
    return true;
  } catch {
    const secret = req.headers.get("x-superadmin-secret");
    return !!(secret && secret === process.env.SUPERADMIN_SECRET);
  }
}

export async function POST(req: Request) {
  try {
    if (!(await assertSuperadminAuth(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await req.json());
    const docRef = adminDb().collection("pending_registrations").doc(body.registrationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.status !== "pending_superadmin") {
      return NextResponse.json(
        { error: `Status pendaftaran: ${data.status}` },
        { status: 400 }
      );
    }

    if (body.action === "reject") {
      await docRef.update({
        status: "rejected",
        rejectedReason: body.reason || "Ditolak oleh superadmin",
        rejectedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    const result = await completeRegistration(body.registrationId, data as Parameters<
      typeof completeRegistration
    >[1]);

    return NextResponse.json({
      ok: true,
      status: "approved",
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Approval gagal" },
      { status: 400 }
    );
  }
}
