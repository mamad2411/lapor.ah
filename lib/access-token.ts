import { randomBytes } from "crypto";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebase/admin";

export type AccessTokenType = "register" | "reset";

const COLLECTION = "access_tokens";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // minimal 1 hari

export function generateAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createAccessToken(params: {
  type: AccessTokenType;
  email: string;
  phone?: string;
  villageName?: string;
  latitude?: string;
  longitude?: string;
  position?: string;
  description?: string;
}) {
  const token = generateAccessToken();
  const now = Date.now();

  await adminDb()
    .collection(COLLECTION)
    .doc(token)
    .set({
      type: params.type,
      email: params.email.toLowerCase().trim(),
      phone: params.phone || null,
      villageName: params.villageName || null,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
      position: params.position || null,
      description: params.description ?? null,
      used: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + TOKEN_TTL_MS),
    });

  return { token, expiresAt: new Date(now + TOKEN_TTL_MS) };
}

export async function getAccessToken(token: string) {
  const doc = await adminDb().collection(COLLECTION).doc(token).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as {
    id: string;
    type: AccessTokenType;
    email: string;
    phone?: string | null;
    nik?: string | null;
    name?: string | null;
    villageName?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    position?: string | null;
    description?: string | null;
    used: boolean;
    expiresAt: FirebaseFirestore.Timestamp;
  };
}

export async function validateAccessToken(token: string, expectedType?: AccessTokenType) {
  const data = await getAccessToken(token);
  if (!data) return { valid: false, error: "Token tidak ditemukan" as const };
  if (data.used) return { valid: false, error: "Token sudah digunakan" as const };
  if (expectedType && data.type !== expectedType) {
    return { valid: false, error: "Jenis token tidak sesuai" as const };
  }
  if (data.expiresAt.toMillis() < Date.now()) {
    return { valid: false, error: "Token sudah kedaluwarsa" as const };
  }
  return { valid: true, data };
}

export async function markTokenUsed(token: string) {
  await adminDb().collection(COLLECTION).doc(token).update({
    used: true,
    usedAt: FieldValue.serverTimestamp(),
  });
}

export async function getActiveTokenByEmail(email: string, type: AccessTokenType) {
  // Ambil semua token untuk email & tipe ini
  // Kita lakukan filter & sort di memory untuk menghindari keharusan membuat composite index di Firestore
  const snapshot = await adminDb()
    .collection(COLLECTION)
    .where("email", "==", email.toLowerCase().trim())
    .where("type", "==", type)
    .get();

  if (snapshot.empty) return null;
  
  const docs = snapshot.docs
    .map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
        expiresAtMillis: data.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0
      } as any;
    })
    .filter(d => {
      // Filter yang belum digunakan DAN belum kadaluarsa
      const notUsed = d.used === false;
      const notExpired = d.expiresAtMillis > Date.now();
      return notUsed && notExpired;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  if (docs.length === 0) return null;
  
  const data = docs[0];
  return {
    id: data.id,
    token: data.id,
    ...data,
    isExpired: false
  };
}

/**
 * Menghitung jumlah token yang dikirim dalam 24 jam terakhir untuk email tertentu
 */
export async function countRecentTokensByEmail(email: string, type: AccessTokenType) {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  const snapshot = await adminDb()
    .collection(COLLECTION)
    .where("email", "==", email.toLowerCase().trim())
    .where("type", "==", type)
    .get();

  const recentTokens = snapshot.docs.filter(doc => {
    const data = doc.data();
    const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
    return createdAt > oneDayAgo;
  });

  return recentTokens.length;
}

export async function invalidateAllActiveTokens(email: string, type: AccessTokenType) {
  const snapshot = await adminDb()
    .collection(COLLECTION)
    .where("email", "==", email.toLowerCase().trim())
    .where("type", "==", type)
    .where("used", "==", false)
    .get();

  const batch = adminDb().batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { 
      used: true, 
      invalidated: true,
      invalidatedAt: FieldValue.serverTimestamp() 
    });
  });
  await batch.commit();
}

export function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
