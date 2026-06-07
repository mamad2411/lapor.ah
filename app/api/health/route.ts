import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasFirebase =
    Boolean(process.env.FIREBASE_PROJECT_ID) &&
    Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
    Boolean(process.env.FIREBASE_PRIVATE_KEY);

  const hasStorage = Boolean(
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      firebaseAdmin: hasFirebase,
      storageBucket: hasStorage,
      node: process.version,
    },
  });
}
