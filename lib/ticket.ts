import { randomBytes, createHash } from "crypto";

export function generateTicketId(): string {
  const year = new Date().getFullYear();
  const seq = randomBytes(3).toString("hex").toUpperCase();
  return `WBS-${year}-${seq}`;
}

export function generateTrackingPin(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

export function generateAnonymousAlias(): string {
  const num = randomBytes(2).readUInt16BE(0) % 9999;
  return `Warga#${num.toString().padStart(4, "0")}`;
}
