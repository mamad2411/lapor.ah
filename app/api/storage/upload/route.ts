import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase/admin";
import { getDownloadURL } from "firebase-admin/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let formData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("[storage/upload] Failed to parse formData:", e);
      return NextResponse.json(
        { error: "Gagal membaca data form. Pastikan ukuran file tidak melebihi batas (Netlify: 6MB)." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File;
    const uploadPath = (formData.get("path") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime", "video/webm",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Format ${file.type} tidak didukung.` },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ukuran file maksimal 50 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    const storagePath = `${uploadPath}/${fileName}`;

    const storage = adminStorage();
    const bucket = storage.bucket();

    if (!bucket.name) {
      // Fallback: coba ambil bucket name dari environment jika bucket default kosong
      const envBucket = (process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "")
        .replace("gs://", "").replace(/\/$/, "").trim();
      
      if (!envBucket) {
        return NextResponse.json(
          { error: "Firebase Storage Bucket belum dikonfigurasi di environment variabel." },
          { status: 500 }
        );
      }
      
      const manualBucket = storage.bucket(envBucket);
      const fileRef = manualBucket.file(storagePath);
      await fileRef.save(buffer, { metadata: { contentType: file.type } });
      const url = await getDownloadURL(fileRef);
      return NextResponse.json({ url });
    }

    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    let url;
    try {
      url = await getDownloadURL(fileRef);
    } catch (urlErr) {
      console.warn("[storage/upload] getDownloadURL failed, trying fallback publicUrl");
      // Fallback: jika getDownloadURL gagal, coba jadikan publik
      await fileRef.makePublic();
      url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    }

    return NextResponse.json({ url });
  } catch (err: any) {
    const message = err?.message || "Gagal mengunggah file";
    const stack = process.env.NODE_ENV === "development" ? err?.stack : undefined;
    
    console.error("[storage/upload] error:", message, err);
    
    return NextResponse.json(
      { 
        error: message,
        details: err?.code || err?.name,
        stack
      }, 
      { status: 500 }
    );
  }
}
