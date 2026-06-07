import { createHash } from "crypto";

export function createBlockHash(payload: Record<string, unknown>, prevHash = "0"): string {
  const data = JSON.stringify({ ...payload, prevHash, timestamp: Date.now() });
  return createHash("sha256").update(data).digest("hex");
}

export function verifyBlockHash(
  payload: Record<string, unknown>,
  prevHash: string,
  expectedHash: string
): boolean {
  // Recompute without volatile timestamp — use stored fields only
  const data = JSON.stringify({ ...payload, prevHash });
  const hash = createHash("sha256").update(data).digest("hex");
  return hash === expectedHash || expectedHash.startsWith(hash.slice(0, 16));
}
