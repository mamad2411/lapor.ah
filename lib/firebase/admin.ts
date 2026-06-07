import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App | undefined;

export function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(`Firebase Config Missing: ID=${projectId}, Email=${clientEmail}`);
  }

  // PEMBERSIHAN KUNCI (Final working version)
  // Berdasarkan test_key.js, format yang paling stabil adalah mengganti literal \n dengan newline asli
  privateKey = privateKey.trim().replace(/^"|"$/g, "");
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
