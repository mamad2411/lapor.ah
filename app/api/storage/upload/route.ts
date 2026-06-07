import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const uploadPath = formData.get("path") as string || "uploads";

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

    const maxSize = 50 * 1024 * 1024; // Tingkatkan ke 50MB untuk video
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Ukuran file maksimal 50 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Lokasi penyimpanan di folder public agar bisa diakses browser
    // path.join(process.cwd(), "public") biasanya menunjuk ke folder public di root project
    const publicDir = path.join(process.cwd(), "public");
    const targetDir = path.join(publicDir, uploadPath);

    // Pastikan folder tujuan ada, jika tidak buat secara rekursif
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
    }

    // Nama file unik untuk menghindari tabrakan
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    const filePath = path.join(targetDir, fileName);

    // Tulis file ke disk
    await fs.writeFile(filePath, buffer);

    // URL yang bisa diakses oleh frontend (misal: /uploads/123-foto.jpg)
    const url = `/${uploadPath}/${fileName}`;


    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengunggah file secara lokal" },
      { status: 500 }
    );
  }
}
