import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/verify-request";
import { aggregateWilayah, fetchVillageLaporan } from "@/lib/laporan-aggregate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const { data, decoded } = await verifyAdminRequest(req, villageId);

    const uid = villageId || decoded.uid;
    const laporan = await fetchVillageLaporan(uid);

    return NextResponse.json({
      village: {
        name: data.villageName,
        lat: data.latitude,
        lng: data.longitude,
      },
      wilayah: aggregateWilayah(laporan),
      totalLaporan: laporan.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memuat statistik";
    const status = msg === "Unauthorized" ? 401 : msg.includes("cocok") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
