import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyPin } from "@/lib/ticket";

export const runtime = "nodejs";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Diterima — Menunggu dibaca admin",
  dibaca: "Sudah dibaca admin",
  diproses: "Sedang ditindaklanjuti",
  selesai: "Selesai ditangani",
  ditolak: "Ditolak / Tidak valid",
};

export async function POST(req: Request) {
  try {
    const { ticketId, pin } = await req.json();
    if (!ticketId || !pin) {
      return NextResponse.json({ error: "Nomor tiket dan PIN wajib" }, { status: 400 });
    }

    const snap = await adminDb()
      .collection("laporan")
      .where("ticketId", "==", ticketId.toUpperCase().trim())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    const doc = snap.docs[0];
    const data = doc.data();

    if (!verifyPin(pin.toUpperCase().trim(), data.pinHash)) {
      return NextResponse.json({ error: "PIN tidak valid" }, { status: 403 });
    }

    const timeline = (data.timeline || []).map((t: { status: string; note: string; at: string }) => ({
      ...t,
      statusLabel: STATUS_LABELS[t.status] || t.status,
    }));

    return NextResponse.json({
      ticketId: data.ticketId,
      status: data.status,
      statusLabel: STATUS_LABELS[data.status] || data.status,
      adminRead: data.adminRead,
      adminReadAt: data.adminReadAt,
      villageName: data.villageName,
      kategori: data.kategori,
      tingkatUrgensi: data.tingkatUrgensi,
      blockchainHash: data.blockchainHash,
      blockchainVerified: true,
      timeline,
      tanggapan: data.tanggapan ? {
        isi: data.tanggapan.isi,
        petugas: data.tanggapan.petugas,
        createdAt: data.tanggapan.createdAt,
        lokasi: data.tanggapan.lokasi || null,
        documents: data.tanggapan.documents || [],
        extraReplies: data.tanggapan.extraReplies || [],
      } : null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal melacak" },
      { status: 400 }
    );
  }
}
