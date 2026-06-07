import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing village ID" }, { status: 400 });
    }

    const userDoc = await adminDb().collection("users").doc(id).get();
    if (!userDoc.exists || userDoc.data()?.roles !== "ADMIN") {
      return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
    }

    const d = userDoc.data()!;
    // Return only safe public fields
    const profile = {
      id: userDoc.id,
      villageName: d.villageName || "Desa",
      adminName: d.name || "Admin Desa",
      profileImage: d.profileImage || null,
      villageThumbnail: d.villageThumbnail || null,
      catatan: d.settings?.catatan || "",
      latitude: d.latitude || "-6.1754",
      longitude: d.longitude || "106.8272",
    };

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memuat profil desa" },
      { status: 400 }
    );
  }
}
