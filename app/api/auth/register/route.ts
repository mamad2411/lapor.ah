import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAccessToken } from "@/lib/access-token";
import { requireBothOtpVerified } from "@/lib/otp-store";
import { normalizePhone } from "@/lib/phone";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { isVillageLocationTaken } from "@/lib/village-duplicate";
import { verifyDocumentFromUrl } from "@/lib/document-verify";
import { generateBackupCodes, hashBackupCodes } from "@/lib/backup-codes";
import { verifyDualCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16),
  nik: z.string().min(16).max(16),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(9),
  password: z.string().min(8),
  villageName: z.string().min(2),
  latitude: z.string(),
  longitude: z.string(),
  position: z.string().optional().default(""),
  profileImage: z.string().optional(),
  villageThumbnail: z.string().optional(),
  approvalDocument: z.string().min(1),
  /** @deprecated pakai captchaToken untuk reCAPTCHA — digantikan turnstileToken */
  captchaToken: z.string().optional(),
  turnstileToken: z.string().optional(),
  documentVerification: z
    .object({
      valid: z.boolean(),
      score: z.number(),
      fileHash: z.string(),
    })
    .optional(),
  security: z
    .object({
      enable2FA: z.boolean(),
      totpSecret: z.string().optional(),
      dataSupport: z.boolean(),
      visitorId: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const captchaResult = await verifyDualCaptcha({
      turnstileToken: body.turnstileToken,
      recaptchaToken: body.captchaToken,
      remoteIp: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined,
    });
    if (!captchaResult.ok) {
      return NextResponse.json({ error: captchaResult.error || "Verifikasi keamanan gagal." }, { status: 400 });
    }

    const tokenResult = await validateAccessToken(body.token, "register");
    if (!tokenResult.valid) {
      return NextResponse.json({ error: tokenResult.error }, { status: 400 });
    }

    const duplicate = await isVillageLocationTaken(
      body.villageName,
      body.latitude,
      body.longitude
    );
    if (duplicate.taken) {
      return NextResponse.json({ error: duplicate.message }, { status: 400 });
    }

    const otpCheck = await requireBothOtpVerified(body.token, "register");
    if (!otpCheck.ok) {
      return NextResponse.json({ error: otpCheck.error }, { status: 400 });
    }

    const docVerify = await verifyDocumentFromUrl(body.approvalDocument);
    if (!docVerify.valid) {
      return NextResponse.json(
        {
          error: "Dokumen pengesahan tidak lulus verifikasi keaslian",
          checks: docVerify.checks,
        },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();
    const phone = normalizePhone(body.phone);

    let backupCodes: string[] = [];
    let backupCodesHashed: { hash: string; salt: string }[] = [];

    if (body.security?.enable2FA) {
      backupCodes = generateBackupCodes(10);
      backupCodesHashed = hashBackupCodes(backupCodes);
    }

    const registrationRef = adminDb().collection("pending_registrations").doc();
    await registrationRef.set({
      token: body.token,
      nik: body.nik,
      name: body.name,
      email,
      phone,
      password: body.password,
      villageName: body.villageName,
      latitude: body.latitude,
      longitude: body.longitude,
      position: body.position,
      profileImage: body.profileImage ?? null,
      villageThumbnail: body.villageThumbnail ?? null,
      approvalDocument: body.approvalDocument,
      documentVerification: {
        ...docVerify,
        verifiedAt: new Date().toISOString(),
      },
      security: body.security || { enable2FA: false, dataSupport: true },
      backupCodesHashed,
      backupCodesPlain: backupCodes.length > 0 ? backupCodes : null,
      status: "pending_superadmin",
      submittedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      registrationId: registrationRef.id,
      status: "pending_superadmin",
      backupCodes: backupCodes.length > 0 ? backupCodes : undefined,
      message:
        "Pendaftaran berhasil diajukan. Menunggu verifikasi superadmin (estimasi 24 jam).",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pendaftaran gagal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
