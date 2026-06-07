import { randomBytes } from "crypto";
import { hashOtp } from "@/lib/otp";

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString("hex").toUpperCase().match(/.{1,4}/g)!.join("-")
  );
}

export function hashBackupCodes(codes: string[]): { hash: string; salt: string }[] {
  return codes.map((code) => {
    const salt = randomBytes(8).toString("hex");
    return { hash: hashOtp(code.replace(/-/g, ""), salt), salt };
  });
}
