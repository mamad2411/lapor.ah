import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendOtpEmail } from "@/lib/mail";
import { saveOtp } from "@/lib/otp-store";
import { sendOtpWhatsApp } from "@/lib/whatsapp";

export const runtime = "nodejs";

const schema = z.object({
  idToken: z.string().min(10),
  channel: z.enum(["email", "phone"]).optional(),
});

export async function POST(req: Request) {
  try {
    const { idToken, channel } = schema.parse(await req.json());
    const decoded = await adminAuth().verifyIdToken(idToken);
    const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }

    const data = userDoc.data()!;
    if (data.status === "deleted") {
      return NextResponse.json({ error: "Akun telah dinonaktifkan oleh superadmin." }, { status: 403 });
    }
    if (data.status === "banned") {
      const banInfo = data.banInfo;
      const bannedUntil = banInfo?.bannedUntil;
      if (bannedUntil && new Date(bannedUntil) > new Date()) {
        return NextResponse.json({ error: "banned", banInfo }, { status: 403 });
      } else {
        await adminDb().collection("users").doc(decoded.uid).update({
          status: "active",
          banInfo: null
        });
      }
    }
    const security = (data.security || {}) as { enable2FA?: boolean; enableBackupCodes?: boolean };

    // Masuk jalur 2FA/Backup jika salah satu aktif
    if (security.enable2FA || security.enableBackupCodes) {
      return NextResponse.json({
        requires2FA: true,
        requiresOtp: false,
        enable2FA: Boolean(security.enable2FA),
        enableBackupCodes: Boolean(security.enableBackupCodes),
      });
    }

    const loginToken = `login-${decoded.uid}`;
    const email = String(data.email || "");
    const phone = String(data.phone || "");

    if (!channel) {
      return NextResponse.json({
        requires2FA: false,
        requiresOtp: true,
        chooseChannel: true,
        email,
        phone,
      });
    }

    if (channel === "email") {
      const emailCode = await saveOtp({
        purpose: "register",
        token: loginToken,
        channel: "email",
        identifier: email,
      });
      await sendOtpEmail(email, emailCode, "verifikasi login admin");
      return NextResponse.json({
        requires2FA: false,
        requiresOtp: true,
        channel: "email",
        email,
      });
    } else {
      const phoneCode = await saveOtp({
        purpose: "register",
        token: loginToken,
        channel: "phone",
        identifier: phone,
      });
      await sendOtpWhatsApp(phone, phoneCode, "verifikasi login admin").catch(() => {});
      return NextResponse.json({
        requires2FA: false,
        requiresOtp: true,
        channel: "phone",
        phone,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal kirim OTP" },
      { status: 400 }
    );
  }
}
