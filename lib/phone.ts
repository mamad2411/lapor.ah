/** Normalisasi nomor Indonesia ke format 62xxxxxxxxxx */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function maskPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (n.length < 6) return n;
  return `${n.slice(0, 4)}****${n.slice(-3)}`;
}
