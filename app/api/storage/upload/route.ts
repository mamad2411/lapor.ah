import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase/admin";

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
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Format ${file.type} tidak didukung. Gunakan Gambar, Video (MP4/WebM), Audio (MP3/OGG), atau PDF.` },
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

    const bucket = adminStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    // Buat public URL pakai signed URL dengan expiry 10 tahun
    const [signedUrl] = await fileRef.getSignedUrl({
      action: "read",
      expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}
