import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyTotpCode, verifyBackupCode } from "@/lib/verify-2fa";
import { checkOtp } from "@/lib/otp-store";
import { limits } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  idToken: z.string().min(10),
  totpCode: z.string().optional(),
  backupCode: z.string().optional(),
  emailOtp: z.string().optional(),
  phoneOtp: z.string().optional(),
  purpose: z.enum(["login", "document", "reset"]).default("login"),
});

export async function POST(req: Request) {
  // Rate limit per IP first (cheap check before Firebase call)
  const ip = req.headers.get("x-client-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const isLocalIp = ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip === "unknown";
  const isDev = process.env.NODE_ENV === "development";

  if (!isLocalIp && !isDev) {
    const ipLimit = await limits.twofa(ip);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((ipLimit.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  try {
    const body = schema.parse(await req.json());
    const decoded = await adminAuth().verifyIdToken(body.idToken);

    // Per-UID rate limit (5 attempts per 15 min)
    if (!isDev) {
      const uidLimit = await limits.twofa(decoded.uid);
      if (!uidLimit.allowed) {
        return NextResponse.json(
          { error: "Terlalu banyak percobaan verifikasi. Tunggu 15 menit." },
          { status: 429, headers: { "Retry-After": String(Math.ceil((uidLimit.resetAt - Date.now()) / 1000)) } }
        );
      }
    }

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
    const security = (data.security || {}) as {
      enable2FA?: boolean;
      enableBackupCodes?: boolean;
      totpSecret?: string;
    };

    // ── TOTP path ───────────────────────────────────────────────────────────
    if (body.totpCode) {
      if (!security.enable2FA || !security.totpSecret) {
        return NextResponse.json({ error: "2FA tidak diaktifkan" }, { status: 403 });
      }
      const ok = verifyTotpCode(security.totpSecret, body.totpCode);
      if (!ok) return NextResponse.json({ error: "Kode authenticator tidak valid" }, { status: 403 });
      return NextResponse.json({ ok: true, method: "totp" });
    }

    // ── Backup code path ────────────────────────────────────────────────────
    if (body.backupCode) {
      if (!security.enableBackupCodes) {
        return NextResponse.json({ error: "Kode cadangan tidak diaktifkan" }, { status: 403 });
      }
      const result = verifyBackupCode(body.backupCode, data.backupCodesHashed || []);
      if (!result.ok) {
        return NextResponse.json({ error: "Kode cadangan tidak valid atau sudah dipakai" }, { status: 403 });
      }
      const codes = [...(data.backupCodesHashed || [])];
      codes[result.index] = { ...codes[result.index], used: true };
      await userDoc.ref.update({ backupCodesHashed: codes });
      return NextResponse.json({ ok: true, method: "backup" });
    }

    // ── OTP path ────────────────────────────────────────────────────────────
    const loginToken = `login-${decoded.uid}`;

    if (body.emailOtp) {
      const check = await checkOtp({ purpose: "register", token: loginToken, channel: "email", code: body.emailOtp });
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      return NextResponse.json({ ok: true, method: "email-otp" });
    }

    if (body.phoneOtp) {
      const check = await checkOtp({ purpose: "register", token: loginToken, channel: "phone", code: body.phoneOtp });
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      return NextResponse.json({ ok: true, method: "phone-otp" });
    }

    return NextResponse.json({ error: "Tidak ada kode yang dikirim" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verifikasi gagal" },
      { status: 400 }
    );
  }
}
