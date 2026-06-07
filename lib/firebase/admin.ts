import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | undefined;

export function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "")
    .replace("gs://", "")
    .replace(/\/$/, "")
    .trim();

  if (getApps().length > 0) {
    const existingApp = getApps()[0];
    // Pastikan storageBucket terpasang jika belum ada
    if (!existingApp.options.storageBucket && storageBucket) {
      existingApp.options.storageBucket = storageBucket;
    }
    return existingApp;
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(`Firebase Admin Config Missing: ProjectID=${projectId ? 'OK' : 'MISSING'}, Email=${clientEmail ? 'OK' : 'MISSING'}, Key=${privateKey ? 'OK' : 'MISSING'}`);
  }

  // PEMBERSIHAN KUNCI
  // 1. Hilangkan tanda kutip di awal/akhir jika ada (sering terjadi di Netlify/Vercel)
  privateKey = privateKey.trim().replace(/^['"]|['"]$/g, "");
  
  // 2. Ganti literal \n dengan newline asli
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  // Pastikan header/footer ada (hanya jika belum ada)
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }


  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    return adminApp;
  } catch (err) {
    throw err;
  }
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export function adminStorage() {
  return getStorage(getAdminApp());
}

export { FieldValue, Timestamp };
