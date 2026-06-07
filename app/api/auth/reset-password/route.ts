import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { markTokenUsed, validateAccessToken } from "@/lib/access-token";
import { checkOtp } from "@/lib/otp-store";
import { verifyTotpCode, verifyBackupCode } from "@/lib/verify-2fa";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  emailOtp: z.string().length(6),
  phoneOtp: z.string().min(6).max(6),
  firebasePhoneVerified: z.boolean().optional(),
  totpCode: z.string().optional(),
  backupCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const tokenResult = await validateAccessToken(body.token, "reset");
    if (!tokenResult.valid || !tokenResult.data) {
      return NextResponse.json({ error: tokenResult.error || "Token tidak valid" }, { status: 400 });
    }

    const { data } = tokenResult;
    // Verifikasi OTP Email
    const emailOtpResult = await checkOtp({
      purpose: "register", // purpose register for OTP API
      token: body.token,
      channel: "email",
      code: body.emailOtp,
    });
    if (!emailOtpResult.ok) {
      return NextResponse.json({ error: emailOtpResult.error }, { status: 400 });
    }

    // Verifikasi OTP Telepon (WhatsApp/Firebase)
    const phoneOtpResult = body.firebasePhoneVerified
      ? { ok: true }
      : await checkOtp({
          purpose: "register", // purpose register for OTP API
          token: body.token,
          channel: "phone",
          code: body.phoneOtp,
        });
    if (!phoneOtpResult.ok) {
      return NextResponse.json({ error: (phoneOtpResult as any).error }, { status: 400 });
    }

    const email = data.email;
    const user = await adminAuth().getUserByEmail(email);
    const userDoc = await adminDb().collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    const security = (userData?.security || {}) as {
      enable2FA?: boolean;
      totpSecret?: string;
    };

    if (security.enable2FA && security.totpSecret) {
      const totpOk = body.totpCode
        ? verifyTotpCode(security.totpSecret, body.totpCode)
        : false;
      const backupOk = body.backupCode
        ? verifyBackupCode(body.backupCode, userData?.backupCodesHashed || [])
        : { ok: false as const };

      if (!totpOk && !backupOk.ok) {
        return NextResponse.json(
          { error: "2FA aktif — masukkan kode authenticator atau kode cadangan" },
          { status: 403 }
        );
      }

      if (backupOk.ok && userDoc.exists) {
        const codes = [...(userData?.backupCodesHashed || [])];
        codes[backupOk.index] = { ...codes[backupOk.index], used: true };
        await userDoc.ref.update({ backupCodesHashed: codes });
      }
    }

    await adminAuth().updateUser(user.uid, { password: body.password });
    await markTokenUsed(body.token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset gagal" },
      { status: 400 }
    );
  }
}
