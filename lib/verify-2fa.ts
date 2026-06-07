import { verifySync } from "otplib";
import { timingSafeEqual } from "crypto";
import { verifyOtp } from "@/lib/otp";

export interface BackupCodeEntry {
  hash: string;
  salt: string;
  used?: boolean;
}

export function verifyTotpCode(secret: string, code: string): boolean {
  if (!secret || !code) return false;
  try {
    const result = verifySync({
      token: code.replace(/\s/g, ""),
      secret,
      epochTolerance: 30, // allow 1 step skew (±30s) to handle clock drift
    });
    return result.valid === true;
  } catch {
    return false;
  }
}

/** Constant-time backup code verification to prevent timing attacks */
export function verifyBackupCode(
  code: string,
  entries: BackupCodeEntry[]
): { ok: true; index: number } | { ok: false } {
  const normalized = code.replace(/-/g, "").toUpperCase();
  let matchIndex = -1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.used) continue;

    const computedHash = Buffer.from(
      require("crypto").createHash("sha256").update(`${entry.salt}:${normalized}`).digest("hex")
    );
    const storedHash = Buffer.from(entry.hash);

    // Constant-time compare only works on equal-length buffers
    if (
      computedHash.length === storedHash.length &&
      timingSafeEqual(computedHash, storedHash)
    ) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) return { ok: false };
  return { ok: true, index: matchIndex };
}
