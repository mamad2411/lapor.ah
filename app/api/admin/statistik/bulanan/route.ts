import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/verify-request";
import { aggregateBulanan, fetchVillageLaporan, aggregateRingkasan, aggregateRingkasanForRange } from "@/lib/laporan-aggregate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const { data, decoded } = await verifyAdminRequest(req, villageId);

    const uid = villageId || decoded.uid;
    const laporan = await fetchVillageLaporan(uid);
    const statsBulanan = aggregateBulanan(laporan);
    const statsRingkasan = aggregateRingkasan(laporan);

    // Compute stats for different time ranges
    const byRange = {
      hari: aggregateRingkasanForRange(laporan, "hari"),
      minggu: aggregateRingkasanForRange(laporan, "minggu"),
      bulan: aggregateRingkasanForRange(laporan, "bulan"),
      tahun: aggregateRingkasanForRange(laporan, "tahun"),
      semua: aggregateRingkasanForRange(laporan, "semua"),
    };

    return NextResponse.json({
      villageName: data.villageName,
      ...statsBulanan,
      ringkasan: {
        ...statsRingkasan,
        byRange,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memuat statistik";

    const status = msg === "Unauthorized" ? 401 : msg.includes("cocok") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
