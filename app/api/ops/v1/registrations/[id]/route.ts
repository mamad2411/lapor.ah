import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { completeRegistration } from "@/lib/complete-registration";
import { logOpsAudit } from "@/lib/superadmin/auth";
import { sendRegistrationRejectedEmail } from "@/lib/mail";
import { sendRegistrationRejectedWhatsApp } from "@/lib/whatsapp";
import { getAppBaseUrl } from "@/lib/url";

export const runtime = "nodejs";

function mapRegistrationDetail(id: string, d: Record<string, unknown>) {
  const docVerify = d.documentVerification as Record<string, unknown> | null;
  return {
    id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    nik: d.nik,
    villageName: d.villageName,
    latitude: d.latitude,
    longitude: d.longitude,
    position: d.position || "",
    profileImage: d.profileImage || null,
    villageThumbnail: d.villageThumbnail || null,
    approvalDocument: d.approvalDocument || null,
    documentVerification: docVerify
      ? {
          valid: Boolean(docVerify.valid),
          score: typeof docVerify.score === "number" ? docVerify.score : 0,
          fileHash: (docVerify.fileHash as string) || "",
          checks: (docVerify.checks as { name: string; passed: boolean; detail: string }[]) || [],
          verifiedAt: (docVerify.verifiedAt as string) || "",
        }
      : null,
    security: d.security || { enable2FA: false, dataSupport: true },
    status: d.status,
    submittedAt: d.submittedAt || "",
    createdAt:
      (d.createdAt as { toDate?: () => Date } | undefined)?.toDate?.()?.toISOString?.() || "",
    rejectedReason: d.rejectedReason || null,
    rejectionToken: d.rejectionToken || null,
    rejectionUrl: d.rejectionUrl || null,
    mapsUrl: d.latitude && d.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`
      : null,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOpsSession(req);
    const { id } = await params;
    const doc = await adminDb().collection("pending_registrations").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ registration: mapRegistrationDetail(id, doc.data()!) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().min(5).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOpsSession(req);
    const { id } = await params;
    const body = schema.parse(await req.json());

    const docRef = adminDb().collection("pending_registrations").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.status !== "pending_superadmin") {
      return NextResponse.json({ error: `Status: ${data.status}` }, { status: 400 });
    }

    if (body.action === "reject") {
      if (!body.reason?.trim()) {
        return NextResponse.json({ error: "Alasan penolakan wajib diisi" }, { status: 400 });
      }

      const rejectionToken = `REJ-${randomBytes(5).toString("hex").toUpperCase()}`;
      const rejectionUrl = `${getAppBaseUrl()}/auth/ditolak/${rejectionToken}`;

      await docRef.update({
        status: "rejected",
        rejectedReason: body.reason,
        rejectionToken,
        rejectionUrl,
        rejectedAt: FieldValue.serverTimestamp(),
        rejectedBy: session.email,
        password: FieldValue.delete(),
      });

      await sendRegistrationRejectedEmail(
        data.email,
        data.name,
        data.villageName,
        body.reason,
        rejectionUrl,
        rejectionToken
      ).catch(() => {});

      await sendRegistrationRejectedWhatsApp(
        data.phone,
        data.villageName,
        body.reason,
        rejectionUrl,
        rejectionToken
      ).catch(() => {});

      await logOpsAudit({
        action: "reject_registration",
        actorUid: session.uid,
        actorEmail: session.email,
        targetType: "pending_registration",
        targetId: id,
        details: { reason: body.reason, rejectionToken, rejectionUrl },
      });

      return NextResponse.json({
        ok: true,
        status: "rejected",
        rejectionToken,
        rejectionUrl,
      });
    }

    if (!data.password) {
      return NextResponse.json(
        { error: "Data password tidak ditemukan. Calon admin harus mendaftar ulang." },
        { status: 400 }
      );
    }

    const result = await completeRegistration(
      id,
      data as Parameters<typeof completeRegistration>[1],
      { skipOtpCheck: true }
    );

    await logOpsAudit({
      action: "approve_registration",
      actorUid: session.uid,
      actorEmail: session.email,
      targetType: "pending_registration",
      targetId: id,
      details: { uid: result.uid, adminUrl: result.adminUrl },
    });

    return NextResponse.json({ ok: true, status: "approved", ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memproses";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
