import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function initFirebase() {
  if (typeof window === "undefined") return;
  if (app) return;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return;

  app = getApps().length
    ? getApps()[0]
    : initializeApp({
        apiKey,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.replace("gs://", "").replace(/\/$/, ""),
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      });

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export function getAuthClient(): Auth {
  initFirebase();
  if (!auth) {
    throw new Error("Firebase belum dikonfigurasi. Isi NEXT_PUBLIC_FIREBASE_* di .env.local");
  }
  return auth;
}

export function getDbClient(): Firestore {
  initFirebase();
  if (!db) {
    throw new Error("Firebase belum dikonfigurasi. Isi NEXT_PUBLIC_FIREBASE_* di .env.local");
  }
  return db;
}

export function getStorageClient(): FirebaseStorage {
  initFirebase();
  if (!storage) {
    throw new Error("Firebase belum dikonfigurasi. Isi NEXT_PUBLIC_FIREBASE_* di .env.local");
  }
  return storage;
}
