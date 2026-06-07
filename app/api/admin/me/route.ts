import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { mapAdminProfile } from "@/lib/admin/map-profile";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth().verifyIdToken(idToken);
    const { searchParams } = new URL(req.url);
    const urlUid = searchParams.get("id");
    const urlToken = searchParams.get("token");

    if (urlUid && urlUid !== decoded.uid) {
      return NextResponse.json({ error: "ID sesi tidak cocok" }, { status: 403 });
    }

    const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    }

    const data = userDoc.data()!;
    if (data.status === "banned") {
      return NextResponse.json({ error: "Akun Anda sedang ditangguhkan (Banned)" }, { status: 403 });
    }
    if (data.roles !== "ADMIN" || data.status === "deleted") {
      return NextResponse.json({ error: "Bukan akun admin desa" }, { status: 403 });
    }

    if (!urlToken) {
      return NextResponse.json({ error: "Token admin wajib di URL" }, { status: 403 });
    }
    if (data.adminToken !== urlToken) {
      return NextResponse.json({ error: "Token admin tidak valid" }, { status: 403 });
    }

    return NextResponse.json({ profile: mapAdminProfile(userDoc) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat profil" },
      { status: 401 }
    );
  }
}
