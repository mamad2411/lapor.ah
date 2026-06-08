import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getDownloadURL } from "firebase-admin/storage";
import { adminStorage } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const NETLIFY_MAX_BYTES = 6 * 1024 * 1024;
const LOCAL_MAX_BYTES = 50 * 1024 * 1024;

function maxUploadBytes() {
  return process.env.NODE_ENV === "development" ? LOCAL_MAX_BYTES : NETLIFY_MAX_BYTES;
}

function resolveBucketName() {
  return (process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "")
    .replace(/^gs:\/\//, "")
    .replace(/\/$/, "")
    .trim();
}

function buildFirebaseMediaUrl(bucketName: string, storagePath: string, token: string) {
  const encoded = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
}

async function uploadToLocalPublic(uploadPath: string, safeName: string, buffer: Buffer) {
  const dir = path.join(process.cwd(), "public", uploadPath);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), buffer);
  // Pastikan selalu mulai dengan / untuk root-relative path
  return `/${uploadPath}/${safeName}`.replace(/\/+/g, "/");
}

async function uploadToFirebase(
  bucketName: string,
  storagePath: string,
  buffer: Buffer,
  fileType: string
) {
  const bucket = adminStorage().bucket(bucketName);
  const fileRef = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await fileRef.save(buffer, {
    metadata: {
      contentType: fileType,
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  try {
    const url = await getDownloadURL(fileRef);
    if (!url.startsWith("http")) throw new Error("Invalid URL from getDownloadURL");
    return url;
  } catch {
    return buildFirebaseMediaUrl(bucketName, storagePath, downloadToken);
  }
}

export async function POST(req: Request) {
  const limit = maxUploadBytes();

  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > limit) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${Math.round(limit / 1024 / 1024)} MB.` },
        { status: 413 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("[storage/upload] formData error:", e);
      return NextResponse.json({ error: "Gagal membaca file upload." }, { status: 400 });
    }

    const file = formData.get("file");
    let rawPath = ((formData.get("path") as string) || "misc").replace(/[^a-zA-Z0-9/_-]/g, "");
    if (!rawPath) rawPath = "misc";
    
    // Selalu simpan di dalam folder 'uploads' untuk menghindari collision dengan route app (seperti /laporan)
    const uploadPath = `uploads/${rawPath}`.replace(/\/+/g, "/");

    // Validasi tambahan untuk diskusi dan profile desa (tidak boleh ada audio/backsound di video)
    const isDiscussionOrProfile = uploadPath.includes("diskusi") || uploadPath.includes("desa") || uploadPath.includes("profile");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const fileName = (file as File).name || "upload";
    let fileType = file.type || "application/octet-stream";

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "video/quicktime", "video/webm",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
      "application/pdf",
    ];

    // Jika upload ke diskusi/desa, blokir tipe audio langsung
    if (isDiscussionOrProfile && fileType.startsWith("audio/")) {
      return NextResponse.json({ error: "Format audio tidak didukung untuk modul ini." }, { status: 400 });
    }

    // Beberapa browser Windows tidak set MIME type — deteksi dari ekstensi
    if (!allowedTypes.includes(fileType)) {
      const ext = fileName.split(".").pop()?.toLowerCase();
      const byExt: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        ogg: "audio/ogg",
        pdf: "application/pdf",
      };
      if (ext && byExt[ext]) fileType = byExt[ext];
    }

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: `Format file tidak didukung (${fileType}).` }, { status: 400 });
    }

    if (file.size > limit) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${Math.round(limit / 1024 / 1024)} MB.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    const storagePath = `${uploadPath}/${safeName}`.replace(/\/+/g, "/");

    const bucketName = resolveBucketName();
    let url: string;
    let storage: "firebase" | "local" = "firebase";

    const isProd = process.env.NODE_ENV === "production";

    if (bucketName) {
      try {
        console.log(`[storage/upload] Attempting Firebase upload to bucket: ${bucketName}, path: ${storagePath}`);
        url = await uploadToFirebase(bucketName, storagePath, buffer, fileType);
      } catch (firebaseErr) {
        const errMsg = firebaseErr instanceof Error ? firebaseErr.message : String(firebaseErr);
        console.error("[storage/upload] Firebase error details:", { message: errMsg, error: firebaseErr });
        
        if (!isProd) {
          console.warn("[storage/upload] Falling back to local storage (Development only)");
          url = await uploadToLocalPublic(uploadPath, safeName, buffer);
          storage = "local";
        } else {
          throw new Error(`Firebase upload failed: ${errMsg}`);
        }
      }
    } else if (!isProd) {
      console.warn("[storage/upload] No bucket configured, using local storage (Development)");
      url = await uploadToLocalPublic(uploadPath, safeName, buffer);
      storage = "local";
    } else {
      console.error("[storage/upload] Production error: FIREBASE_STORAGE_BUCKET missing");
      return NextResponse.json(
        { 
          error: "Konfigurasi Storage Hilang", 
          hint: "FIREBASE_STORAGE_BUCKET belum diset di environment variables production (Netlify/Vercel)." 
        },
        { status: 500 }
      );
    }

    console.log(`[storage/upload] Success: ${url} (Type: ${storage})`);
    return NextResponse.json({ url, storage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah file";
    const code = (err as { code?: number | string })?.code;
    console.error("[storage/upload] error:", message, code, err);
    return NextResponse.json(
      {
        error: message,
        hint:
          code === 404
            ? "Bucket Storage belum ada — aktifkan Firebase Storage di console."
            : code === 403
              ? "Service account butuh role Storage Object Admin."
              : undefined,
      },
      { status: 500 }
    );
  }
}
