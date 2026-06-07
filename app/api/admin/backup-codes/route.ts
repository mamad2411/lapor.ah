import { NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase/admin";
import { z } from "zod";
import { saveOtp, checkOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/mail";
import { sendOtpWhatsApp } from "@/lib/whatsapp";
import { generateBackupCodes, hashBackupCodes } from "@/lib/backup-codes";

export const runtime = "nodejs";

async function getUid(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(auth.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

/** GET — return backup codes list (index + used flag, no hash/salt) */
export async function GET(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await adminDb().collection("users").doc(uid).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const codes = (doc.data()?.backupCodesHashed ?? []) as { used?: boolean }[];
  return NextResponse.json({
    codes: codes.map((c, i) => ({ index: i, used: Boolean(c.used) })),
  });
}

/** PATCH — toggle used flag for a specific code index */
export async function PATCH(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { index, used } = await req.json();
  if (typeof index !== "number" || typeof used !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ref = adminDb().collection("users").doc(uid);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const codes = [...((doc.data()?.backupCodesHashed ?? []) as object[])];
  if (index < 0 || index >= codes.length) {
    return NextResponse.json({ error: "Index out of range" }, { status: 400 });
  }

  codes[index] = { ...(codes[index] as object), used };
  await ref.update({ backupCodesHashed: codes });

  return NextResponse.json({ ok: true });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send-otp"),
    channel: z.enum(["email", "phone"]),
  }),
  z.object({
    action: z.literal("generate"),
    channel: z.enum(["email", "phone"]),
    otpCode: z.string().min(4),
  }),
]);

export async function POST(req: Request) {
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = postSchema.parse(await req.json());
    const userDoc = await adminDb().collection("users").doc(uid).get();
    if (!userDoc.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const userData = userDoc.data()!;
    const otpToken = `backup-codes-${uid}`;

    if (body.action === "send-otp") {
      const email = String(userData.email || "");
      const phone = String(userData.phone || "");

      if (body.channel === "email") {
        if (!email) return NextResponse.json({ error: "Email admin tidak terdaftar" }, { status: 400 });
        const code = await saveOtp({
          purpose: "register",
          token: otpToken,
          channel: "email",
          identifier: email,
        });
        // Background send
        sendOtpEmail(email, code, "regenerasi kode cadangan").catch((e) => console.error("Email Send Error:", e));
      } else {
        if (!phone) return NextResponse.json({ error: "Nomor telepon admin tidak terdaftar" }, { status: 400 });
        const code = await saveOtp({
          purpose: "register",
          token: otpToken,
          channel: "phone",
          identifier: phone,
        });
        // Tidak menggunakan await agar respon ke user lebih cepat
        sendOtpWhatsApp(phone, code, "regenerasi kode cadangan").catch((e) => console.error("WA Send Error:", e));
      }

      return NextResponse.json({ ok: true });
    }

    if (body.action === "generate") {
      const email = String(userData.email || "");
      const phone = String(userData.phone || "");

      const check = await checkOtp({
        purpose: "register",
        token: otpToken,
        channel: body.channel,
        code: body.otpCode,
      });

      if (!check.ok) {
        return NextResponse.json({ error: check.error || "Kode OTP tidak valid" }, { status: 400 });
      }

      const newCodes = generateBackupCodes(10);
      const hashedEntries = hashBackupCodes(newCodes);

      const currentSecurity = userData.security || {};
      await userDoc.ref.update({
        backupCodesHashed: hashedEntries,
        security: {
          ...currentSecurity,
          enableBackupCodes: true,
        },
      });

      return NextResponse.json({ ok: true, codes: newCodes });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan" },
      { status: 400 }
    );
  }
}
