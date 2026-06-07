import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase/admin";
import { getDownloadURL } from "firebase-admin/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
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

    const bucket = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucket) {
      return NextResponse.json({ error: "FIREBASE_STORAGE_BUCKET tidak dikonfigurasi" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    const storagePath = `${uploadPath}/${fileName}`;

    const storage = adminStorage();
    const fileRef = storage.bucket(bucket).file(storagePath);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    const url = await getDownloadURL(fileRef);

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah file";
    console.error("[storage/upload] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
