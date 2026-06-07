import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebase/admin";
import { verifyAdminRequest } from "@/lib/admin/verify-request";
import { verifyTotpCode, verifyBackupCode } from "@/lib/verify-2fa";
import { saveOtp, checkOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/mail";
import { sendOtpWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

const verifySchema = z.object({
  totpCode: z.string().optional(),
  backupCode: z.string().optional(),
  emailOtp: z.string().optional(),
  phoneOtp: z.string().optional(),
});

const sendOtpSchema = z.object({ action: z.literal("send-otp") });

export async function POST(req: Request) {
  try {
    const { uid, userDoc, data } = await verifyAdminRequest(req);
    const body = await req.json();

    if (body.action === "send-otp") {
      const channel = body.channel as "email" | "phone";
      if (channel !== "email" && channel !== "phone") {
        return NextResponse.json({ error: "Channel harus email atau phone" }, { status: 400 });
      }
      const security = data.security as { enable2FA?: boolean; enableBackupCodes?: boolean } | undefined;
      if (security?.enable2FA) {
        return NextResponse.json({ error: "Akun memakai 2FA, verifikasi menggunakan opsi tersebut" }, { status: 400 });
      }

      const docToken = `doc-${uid}`;
      if (channel === "email") {
        const email = String(data.email || "");
        if (!email) return NextResponse.json({ error: "Email tidak terdaftar" }, { status: 400 });
        const code = await saveOtp({
          purpose: "register",
          token: docToken,
          channel: "email",
          identifier: email,
        });
        // Background send
        sendOtpEmail(email, code, "akses dokumen pengesahan").catch((e) => console.error("Email Send Error:", e));
      } else {
        const phone = String(data.phone || "");
        if (!phone) return NextResponse.json({ error: "Nomor telepon tidak terdaftar" }, { status: 400 });
        const code = await saveOtp({
          purpose: "register",
          token: docToken,
          channel: "phone",
          identifier: phone,
        });
        // Tidak menggunakan await agar respon ke user lebih cepat
        sendOtpWhatsApp(phone, code, "akses dokumen pengesahan").catch((e) => console.error("WA Send Error:", e));
      }

      return NextResponse.json({ ok: true, requiresOtp: true, channel });
    }

    const parsed = verifySchema.parse(body);
    const security = (data.security || {}) as {
      enable2FA?: boolean;
      enableBackupCodes?: boolean;
      totpSecret?: string;
    };

    if (security.enable2FA && security.totpSecret) {
      const totpOk = (parsed.totpCode && security.enable2FA && security.totpSecret)
        ? verifyTotpCode(security.totpSecret, parsed.totpCode)
        : false;
      const backupOk = (parsed.backupCode && security.enableBackupCodes)
        ? verifyBackupCode(parsed.backupCode, data.backupCodesHashed || [])
        : { ok: false as const };

      if (!totpOk && !backupOk.ok) {
        return NextResponse.json({ error: "Verifikasi keamanan gagal" }, { status: 403 });
      }

      if (backupOk.ok) {
        const codes = [...(data.backupCodesHashed || [])];
        codes[backupOk.index] = { ...codes[backupOk.index], used: true };
        await userDoc.ref.update({ backupCodesHashed: codes });
      }
    } else {
      const docToken = `doc-${uid}`;
      if (parsed.emailOtp) {
        const emailCheck = await checkOtp({
          purpose: "register",
          token: docToken,
          channel: "email",
          code: parsed.emailOtp,
        });
        if (!emailCheck.ok) {
          return NextResponse.json({ error: emailCheck.error || "Kode OTP email tidak valid" }, { status: 400 });
        }
      } else if (parsed.phoneOtp) {
        const phoneCheck = await checkOtp({
          purpose: "register",
          token: docToken,
          channel: "phone",
          code: parsed.phoneOtp,
        });
        if (!phoneCheck.ok) {
          return NextResponse.json({ error: phoneCheck.error || "Kode OTP WhatsApp tidak valid" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Kirim salah satu kode OTP (Email atau WhatsApp)" }, { status: 400 });
      }
    }

    const accessToken = randomBytes(24).toString("hex");
    await adminDb()
      .collection("document_access")
      .doc(accessToken)
      .set({
        uid,
        purpose: "approval_document",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
      });

    return NextResponse.json({ ok: true, accessToken, expiresIn: 900 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verifikasi gagal";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
