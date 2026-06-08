import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function sanitizeUrl(url: string, path: string = "uploads") {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("blob:")) return url;
  
  // Jika lokal dan tidak mulai dengan /, tambahkan / dan pastikan path benar
  let clean = url.trim();
  if (!clean.startsWith("/")) {
    // Jika tidak ada prefix path, tambahkan
    if (!clean.includes("/")) {
      clean = `/${path}/${clean}`;
    } else {
      clean = `/${clean}`;
    }
  }
  return clean.replace(/\/+/g, "/");
}

function mapDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const d = doc.data()!;
  const rawDocs = d.documents || [];
  
  // Sanitasi semua URL dokumen
  const documents = rawDocs.map((doc: any) => ({
    ...doc,
    url: sanitizeUrl(doc.url, "laporan")
  }));

  // Backward compatibility untuk field 'foto' yang digunakan di beberapa komponen
  const foto = d.foto ? sanitizeUrl(d.foto, "laporan") : (documents[0]?.url || "");

  return {
    id: doc.id,
    ticketId: d.ticketId,
    villageName: d.villageName,
    villageId: d.villageId,
    villageLat: d.villageLat || "",
    villageLng: d.villageLng || "",
    issueLat: d.issueLat || "",
    issueLng: d.issueLng || "",
    issueAddress: d.issueAddress || "",
    kategori: d.kategori,
    kategoriAsli: d.kategoriAsli || d.kategori,
    subKategori: d.subKategori || "",
    deskripsi: d.deskripsi,
    tingkatUrgensi: d.tingkatUrgensi,
    status: d.status,
    adminRead: d.adminRead,
    adminReadAt: d.adminReadAt || null,
    tanggalKejadian: d.tanggalKejadian || "",
    jamKejadian: d.jamKejadian || "",
    rt: d.rt || "",
    rw: d.rw || "",
    documents,
    foto,
    extraForms: d.extraForms || [],
    blockchainHash: d.blockchainHash || "",
    timeline: (d.timeline || []).map((t: { status: string; note: string; at: string }) => t),
    tanggapan: d.tanggapan || null,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
    updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || "",
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const id = searchParams.get("id");

    // GET single
    if (id) {
      const doc = await adminDb().collection("laporan").doc(id).get();
      if (!doc.exists) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ laporan: mapDoc(doc) });
    }

    // GET list
    const snap = await adminDb().collection("laporan").orderBy("createdAt", "desc").limit(100).get();
    let laporan = snap.docs.map(mapDoc);
    if (villageId) laporan = laporan.filter((_, i) => snap.docs[i].data().villageId === villageId);

    return NextResponse.json({ laporan });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat laporan" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, tanggapan } = body;
    if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

    const ref = adminDb().collection("laporan").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const now = new Date().toISOString();
    const data = doc.data()!;
    const timeline = [...(data.timeline || [])];
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    // Auto mark baca
    if (!data.adminRead) {
      update.adminRead = true;
      update.adminReadAt = now;
      timeline.push({ status: "dibaca", note: "Admin telah membaca laporan", at: now });
    }

    if (status && status !== data.status) {
      update.status = status;
      timeline.push({ status, note: `Status diperbarui: ${status}`, at: now });
    }

    if (tanggapan) {
      update.tanggapan = {
        isi: tanggapan.isi,
        petugas: tanggapan.petugas || "Admin",
        lokasi: tanggapan.lokasi || null,
        documents: tanggapan.documents || [],
        extraReplies: tanggapan.extraReplies || [],
        createdAt: now,
      };
      timeline.push({ status: update.status || data.status, note: `Tanggapan: ${tanggapan.isi.slice(0, 80)}`, at: now });
    }

    update.timeline = timeline;
    await ref.update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal update" },
      { status: 400 }
    );
  }
}
