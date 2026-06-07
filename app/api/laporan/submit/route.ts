import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { createBlockHash } from "@/lib/blockchain";
import { generateTicketId, generateTrackingPin, hashPin } from "@/lib/ticket";
import { notifyAdmin } from "@/lib/notify-admin";

export const runtime = "nodejs";

const docSchema = z.object({
  url: z.string(),
  deskripsi: z.string().optional().default(""),
});

const extraFormSchema = z.object({
  kategori: z.string().min(1),
  subKategori: z.string().optional().default(""),
  deskripsi: z.string().min(20),
  urgensi: z.enum(["Darurat", "Tinggi", "Sedang", "Rendah"]).optional().default("Sedang"),
});

const schema = z.object({
  villageId: z.string().min(1),
  villageName: z.string().min(2),
  villageLat: z.string(),
  villageLng: z.string(),
  issueLat: z.string(),
  issueLng: z.string(),
  issueAddress: z.string().optional().default(""),
  kategori: z.string().min(2),
  // subKategori: dipakai sebagai nama kustom saat kategori = "Lainnya"
  subKategori: z.string().optional().default(""),
  deskripsi: z.string().min(20),
  tingkatUrgensi: z.enum(["Darurat", "Tinggi", "Sedang", "Rendah"]),
  tanggalKejadian: z.string().optional().default(""),
  jamKejadian: z.string().optional().default(""),
  rt: z.string().optional().default(""),
  rw: z.string().optional().default(""),
  documents: z.array(docSchema).optional().default([]),
  extraForms: z.array(extraFormSchema).optional().default([]),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    // Hitung kategori efektif — kalau "Lainnya" pakai subKategori sebagai nama
    const kategoriEfektif =
      body.kategori === "Lainnya" && body.subKategori
        ? `Lainnya: ${body.subKategori}`
        : body.kategori;

    let prevHash = "0";
    try {
      const lastSnap = await adminDb()
        .collection("laporan")
        .where("villageId", "==", body.villageId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      if (!lastSnap.empty) {
        prevHash = lastSnap.docs[0].data().blockchainHash as string;
      }
    } catch {
      prevHash = "0";
    }

    const ticketId = generateTicketId();
    const trackingPin = generateTrackingPin();
    const now = new Date().toISOString();

    const docUrls = body.documents.map((d) => d.url).filter(Boolean);

    const blockPayload = {
      ticketId,
      villageId: body.villageId,
      kategori: kategoriEfektif,
      deskripsi: body.deskripsi,
      issueLat: body.issueLat,
      issueLng: body.issueLng,
      documents: docUrls,
    };

    const blockchainHash = createBlockHash(blockPayload, prevHash);

    const docRef = adminDb().collection("laporan").doc();
    await docRef.set({
      ticketId,
      pinHash: hashPin(trackingPin),
      villageId: body.villageId,
      villageName: body.villageName,
      villageLat: body.villageLat,
      villageLng: body.villageLng,
      issueLat: body.issueLat,
      issueLng: body.issueLng,
      issueAddress: body.issueAddress,
      // Kategori: simpan keduanya — nilai asli + nilai efektif
      kategori: kategoriEfektif,
      kategoriAsli: body.kategori,
      subKategori: body.subKategori,
      deskripsi: body.deskripsi,
      tingkatUrgensi: body.tingkatUrgensi,
      tanggalKejadian: body.tanggalKejadian,
      jamKejadian: body.jamKejadian,
      rt: body.rt,
      rw: body.rw,
      // Dokumen lengkap dengan deskripsi
      documents: body.documents,
      // Permasalahan tambahan
      extraForms: body.extraForms,
      blockchainHash,
      blockchainPrevHash: prevHash,
      status: "submitted",
      adminRead: false,
      adminReadAt: null,
      anonymous: true,
      timeline: [{ status: "submitted", note: "Laporan diterima sistem", at: now }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await notifyAdmin({
      villageId: body.villageId,
      type: "laporan",
      title: `Laporan Baru — ${kategoriEfektif}`,
      message: `Tiket ${ticketId} | Urgensi: ${body.tingkatUrgensi}\n${body.deskripsi.slice(0, 120)}...`,
      refId: docRef.id,
    });

    return NextResponse.json({
      ok: true,
      ticketId,
      trackingPin,
      blockchainHash,
      message: "Simpan Nomor Tiket dan PIN — ini satu-satunya cara melacak laporan Anda.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengirim laporan" },
      { status: 400 }
    );
  }
}
