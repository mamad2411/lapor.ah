import { createHmac, randomBytes } from "crypto";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

const COOKIE_NAME = "__lapor_ops_v1";
const SESSION_HOURS = 8;

function getSecret(): string {
  const s = process.env.OPS_SESSION_SECRET || process.env.SUPERADMIN_SECRET;
  if (!s) throw new Error("OPS_SESSION_SECRET belum dikonfigurasi");
  return s;
}

export function signSessionToken(sid: string, nonce: string, exp: number): string {
  const payload = `${sid}.${nonce}.${exp}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseSessionToken(token: string): { sid: string; nonce: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [sid, nonce, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!sid || !nonce || !Number.isFinite(exp)) return null;

  const expected = createHmac("sha256", getSecret())
    .update(`${sid}.${nonce}.${exp}`)
    .digest("base64url");
  if (sig !== expected) return null;
  if (Date.now() > exp) return null;
  return { sid, nonce, exp };
}

export function getCookieName() {
  return COOKIE_NAME;
}

export async function createOpsSession(params: {
  uid: string;
  email: string;
  ip?: string;
  userAgent?: string;
}) {
  const sid = randomBytes(24).toString("hex");
  const nonce = randomBytes(12).toString("hex");
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;

  await adminDb()
    .collection("ops_sessions")
    .doc(sid)
    .set({
      uid: params.uid,
      email: params.email,
      nonce,
      ip: params.ip || null,
      userAgent: params.userAgent || null,
      revoked: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(exp),
    });

  const token = signSessionToken(sid, nonce, exp);
  return { sid, nonce, token, exp, cookieName: COOKIE_NAME };
}

export async function revokeOpsSession(sid: string) {
  await adminDb().collection("ops_sessions").doc(sid).update({ revoked: true });
}

export function extractSessionCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function requireOpsSession(req: Request) {
  const raw = extractSessionCookie(req);
  if (!raw) throw new Error("Unauthorized");

  const parsed = parseSessionToken(raw);
  if (!parsed) throw new Error("Unauthorized");

  const doc = await adminDb().collection("ops_sessions").doc(parsed.sid).get();
  if (!doc.exists || doc.data()?.revoked) throw new Error("Unauthorized");

  const data = doc.data()!;
  if (data.nonce !== parsed.nonce) throw new Error("Unauthorized");
  if (data.expiresAt?.toDate?.() && data.expiresAt.toDate() < new Date()) {
    throw new Error("Unauthorized");
  }

  return {
    sid: parsed.sid,
    nonce: parsed.nonce,
    uid: data.uid as string,
    email: data.email as string,
  };
}
