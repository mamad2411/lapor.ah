import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessToken, getActiveTokenByEmail, invalidateAllActiveTokens, countRecentTokensByEmail } from "@/lib/access-token";
import { getAppBaseUrl } from "@/lib/url";
import { sendAccessLinkEmail } from "@/lib/mail";
import { normalizePhone } from "@/lib/phone";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebase/admin";
import { isVillageLocationTaken } from "@/lib/village-duplicate";
import { resolveLoginAccount } from "@/lib/repair-user-account";

export const runtime = "nodejs";

const schema = z.object({
  type: z.enum(["register", "reset"]),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().optional(),
  villageName: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  position: z.string().optional(),
  description: z.string().optional(),
  action: z.enum(["resend", "new"]).optional(),
});

export async function POST(req: Request) {
  try {
    // ... (keep existing env checks)
    const requiredEnv = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
      "SMTP_USER",
      "SMTP_PASS",
    ];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Konfigurasi server tidak lengkap: ${missingEnv.join(", ")}` },
        { status: 400 }
      );
    }

    let rawBody;
    try {
      rawBody = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
    }
    
    
    const parseResult = schema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map(i => i.message).join(", ");
      return NextResponse.json({ error: `Validasi gagal: ${errorMsg}` }, { status: 400 });
    }

    const body = parseResult.data;
    const email = body.email.toLowerCase().trim();
    const phone = body.phone ? normalizePhone(body.phone) : null;

    // Check for existing active token
    const existingToken = await getActiveTokenByEmail(email, body.type);
    const recentCount = await countRecentTokensByEmail(email, body.type);

    // Hitung kuota yang tersisa dengan benar
    // Jika kita akan membuat token baru (new request), maka current count akan bertambah 1
    const nextCount = recentCount + (body.action === "resend" ? 0 : 1);
    const remainingQuota = Math.max(0, 3 - nextCount);
    
    // 1. Deteksi Spam per IP/Device
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const blockRef = adminDb().collection("ip_blocks").doc(ip.replace(/\./g, "_"));
    const blockDoc = await blockRef.get();
    
    if (blockDoc.exists) {
      const blockData = blockDoc.data()!;
      const blockUntil = blockData.until?.toMillis ? blockData.until.toMillis() : 0;
      if (blockUntil > Date.now()) {
        const daysLeft = Math.ceil((blockUntil - Date.now()) / (1000 * 60 * 60 * 24));
        return NextResponse.json({ 
          error: `Akses diblokir karena terdeteksi aktivitas mencurigakan (spam). Silakan coba lagi dalam ${daysLeft} hari.` 
        }, { status: 429 });
      }
    }

    // 2. Batasi maksimal 3 permintaan dalam 24 jam per email
    if (recentCount >= 3 && existingToken) {
      // Jika sudah 3x dan masih ada token aktif, blokir IP selama 3 hari
      await blockRef.set({
        until: Timestamp.fromMillis(Date.now() + (3 * 24 * 60 * 60 * 1000)),
        reason: "spam_request_access",
        email
      });

      return NextResponse.json({ 
        error: "Batas maksimal permintaan (3x) telah tercapai. Akses dari perangkat Anda dibatasi selama 3 hari untuk keamanan." 
      }, { status: 429 });
    }

    if (existingToken && !body.action) {
      return NextResponse.json({
        token_exists: true,
        message: `Anda sudah pernah mengirim permintaan ${body.type === "register" ? "pendaftaran" : "reset password"} untuk email ${email}. Sisa kuota permintaan: ${remainingQuota}x.`,
      }, { status: 409 });
    }

    if (body.action === "new") {
      await invalidateAllActiveTokens(email, body.type);
    }

    // Jika registrasi, cek Nama Desa
    if (body.type === "register") {
      // ... (keep existing village checks)
      if (!body.villageName) {
        return NextResponse.json(
          { error: "Nama Desa wajib diisi." },
          { status: 400 }
        );
      }

      const duplicate = await isVillageLocationTaken(
        body.villageName,
        body.latitude || "",
        body.longitude || ""
      );
      if (duplicate.taken) {
        return NextResponse.json({ error: duplicate.message }, { status: 400 });
      }
    }

    // Jika reset, cek apakah user sudah ada di database
    if (body.type === "reset") {
      // ... (keep existing reset checks)
      if (!phone) {
        return NextResponse.json({ error: "Nomor telepon wajib untuk reset password" }, { status: 400 });
      }

      const userByEmail = await resolveLoginAccount(email);
      const userByPhone = await resolveLoginAccount(phone);


      if (!userByEmail || !userByPhone) {
        return NextResponse.json(
          { error: "Akun dengan email dan nomor telepon tersebut tidak ditemukan." },
          { status: 400 }
        );
      }

      // Pastikan email dan phone merujuk ke user yang sama (opsional tapi lebih aman)
      if (userByEmail.uid !== userByPhone.uid) {
        return NextResponse.json(
          { error: "Data email dan nomor telepon tidak cocok." },
          { status: 400 }
        );
      }
    }

    try {
      await adminDb().collection("access_requests").add({
        type: body.type,
        email,
        phone,
        villageName: body.villageName ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        position: body.position ?? null,
        description: body.description ?? null,
        status: "approved",
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      const dbErrorMessage = dbErr instanceof Error ? dbErr.message : String(dbErr);
      throw new Error(`Gagal menyimpan permintaan ke database: ${dbErrorMessage}`);
    }

    try {
      let tokenValue: string;
      if (body.action === "resend" && existingToken) {
        tokenValue = existingToken.id;
      } else {
        const { token } = await createAccessToken({
          type: body.type,
          email,
          phone: phone || undefined,
          villageName: body.villageName,
          latitude: body.latitude,
          longitude: body.longitude,
          position: body.position,
          description: body.description,
        });
        tokenValue = token;
      }

      const base = getAppBaseUrl();
      const path =
        body.type === "register" ? `/auth/daftar/${tokenValue}` : `/auth/reset/${tokenValue}`;
      const link = `${base}${path}`;

      const villageData = body.type === "register" ? {
        name: body.villageName!,
        lat: body.latitude!,
        lng: body.longitude!
      } : undefined;

      // Kirim email secara asinkron agar respon API lebih cepat
      sendAccessLinkEmail(email, link, body.type, villageData).catch(err => {
      });
    } catch (tokenErr) {
      throw tokenErr;
    }

    return NextResponse.json({
      message:
        body.action === "resend" 
          ? "Link pendaftaran telah dikirim ulang ke email Anda. Periksa juga folder spam."
          : `Permintaan diterima. Link sekali pakai telah dikirim ke email Anda. Sisa kuota hari ini: ${remainingQuota}x.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Permintaan gagal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

