import { adminDb, FieldValue, Timestamp } from "@/lib/firebase/admin";
import { generateOtp, hashOtp, verifyOtp } from "@/lib/otp";

const COLLECTION = "otp_codes";
const OTP_TTL_MS = 10 * 60 * 1000;

function otpDocId(purpose: string, token: string, channel: string) {
  return `${purpose}_${token}_${channel}`;
}

export async function saveOtp(params: {
  purpose: string;
  token: string;
  channel: "email" | "phone";
  identifier: string;
}) {
  const code = generateOtp(6);
  const salt = generateOtp(8);
  const hash = hashOtp(code, salt);
  const docId = otpDocId(params.purpose, params.token, params.channel);


  await adminDb()
    .collection(COLLECTION)
    .doc(docId)
    .set({
      identifier: params.identifier,
      hash,
      salt,
      attempts: 0,
      verified: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + OTP_TTL_MS),
    });

  return code;
}

export async function checkOtp(params: {
  purpose: string;
  token: string;
  channel: "email" | "phone";
  code: string;
}) {
  const docId = otpDocId(params.purpose, params.token, params.channel);

  const ref = adminDb()
    .collection(COLLECTION)
    .doc(docId);
  const doc = await ref.get();

  if (!doc.exists) {
    return { ok: false, error: "OTP tidak ditemukan — kirim ulang kode OTP" };
  }

  const data = doc.data()!;

  if (data.verified) return { ok: true };
  if (data.expiresAt.toMillis() < Date.now()) return { ok: false, error: "OTP kedaluwarsa — kirim ulang kode" };
  if (data.attempts >= 5) return { ok: false, error: "Terlalu banyak percobaan — kirim ulang kode" };

  const valid = verifyOtp(params.code, data.salt, data.hash);
  if (!valid) {
    await ref.update({ attempts: FieldValue.increment(1) });
    return { ok: false, error: "Kode OTP salah" };
  }

  await ref.update({ verified: true, verifiedAt: FieldValue.serverTimestamp() });
  return { ok: true };
}

export async function requireBothOtpVerified(token: string, purpose: string) {
  for (const channel of ["email", "phone"] as const) {
    const doc = await adminDb()
      .collection(COLLECTION)
      .doc(otpDocId(purpose, token, channel))
      .get();
    if (!doc.exists || !doc.data()?.verified) {
      return { ok: false, error: `Verifikasi ${channel} belum selesai` };
    }
  }
  return { ok: true };
}
