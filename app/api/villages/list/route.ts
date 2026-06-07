import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await adminDb().collection("users").where("roles", "==", "ADMIN").get();

    const villages = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        villageName: d.villageName || "Desa",
        latitude: d.latitude || "-6.1754",
        longitude: d.longitude || "106.8272",
        adminName: d.name || "Admin Desa",
        profileImage: d.profileImage || null,
        villageThumbnail: d.villageThumbnail || null,
        catatan: d.settings?.catatan || "",
      };
    });

    return NextResponse.json({ villages });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat desa" },
      { status: 400 }
    );
  }
}
