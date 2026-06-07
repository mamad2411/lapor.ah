import { createHash, randomInt } from "crypto";

export function generateOtp(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, "0");
}

export function hashOtp(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

export function verifyOtp(code: string, salt: string, hash: string): boolean {
  return hashOtp(code, salt) === hash;
}
