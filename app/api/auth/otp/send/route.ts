import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtpEmail } from "@/lib/mail";
import { saveOtp } from "@/lib/otp-store";
import { sendOtpWhatsApp } from "@/lib/whatsapp";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const schema = z.object({
  channel: z.enum(["email", "phone", "both"]),
  email: z.string().email(),
  phone: z.string().min(9).or(z.null()).or(z.literal("")),
  purpose: z.enum(["register", "reset"]),
  token: z.string().min(16),
}).refine(
  (d) => d.channel === "email" || (d.phone && d.phone.length >= 9),
  { message: "Nomor telepon wajib diisi untuk channel phone/both", path: ["phone"] }
);

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    // Only check token exists and type matches — OTP send is valid even if token is "used"
    // (used flag is only set on final register submit, not during the multi-step flow)
    const { getAccessToken } = await import("@/lib/access-token");
    const tokenData = await getAccessToken(body.token);
    if (!tokenData) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 400 });
    }
    if (tokenData.type !== body.purpose) {
      return NextResponse.json({ error: "Jenis token tidak sesuai" }, { status: 400 });
    }

    const email = body.email.toLowerCase().trim();
    const phone = normalizePhone(body.phone || "");
    const purposeLabel = body.purpose === "register" ? "pendaftaran akun" : "reset password";

    // Simpan OTP ke store
    // Untuk channel "both", simpan 2 dokumen terpisah (email & phone) dengan kode yang sama
    let code: string;

    if (body.channel === "both") {
      // Simpan untuk email
      code = await saveOtp({
        purpose: body.purpose,
        token: body.token,
        channel: "email",
        identifier: email,
      });
      // Simpan untuk phone dengan kode yang sama tidak bisa langsung — simpan ulang
      // saveOtp generate kode baru, jadi simpan phone dengan kode terpisah
      await saveOtp({
        purpose: body.purpose,
        token: body.token,
        channel: "phone",
        identifier: phone,
      });
    } else {
      code = await saveOtp({
        purpose: body.purpose,
        token: body.token,
        channel: body.channel,
        identifier: body.channel === "phone" ? phone : email,
      });
    }

    const sendTasks: Promise<any>[] = [];

    if (body.channel === "email" || body.channel === "both") {
      sendTasks.push(sendOtpEmail(email, code, purposeLabel));
    }

    if (body.channel === "phone" || body.channel === "both") {
      sendTasks.push(sendOtpWhatsApp(phone, code, purposeLabel));
    }

    // Gunakan Promise.allSettled agar jika salah satu gagal (misal WA mati), email tetap terkirim dan sebaliknya
    // Serta agar eksekusi paralel (lebih cepat)
    const results = await Promise.allSettled(sendTasks);
    
    const emailResult = body.channel === "email" || body.channel === "both" 
      ? results[0] 
      : null;
    const waResult = body.channel === "phone" 
      ? results[0] 
      : (body.channel === "both" ? results[1] : null);

    // Jika channel spesifik (bukan both), kita tetap beri error jika gagal
    if (body.channel === "email" && emailResult?.status === "rejected") {
      throw new Error(`Gagal kirim Email: ${emailResult.reason}`);
    }

    if (body.channel === "phone" && waResult?.status === "fulfilled") {
      const wa = waResult.value;
      if (!wa.sent) throw new Error(`Gagal kirim WhatsApp: ${wa.reason}`);
    } else if (body.channel === "phone" && waResult?.status === "rejected") {
      throw new Error(`Gagal kirim WhatsApp: ${waResult.reason}`);
    }

    return NextResponse.json({ 
      sent: true, 
      channel: body.channel,
      details: body.channel === "both" ? {
        email: emailResult?.status === "fulfilled",
        whatsapp: waResult?.status === "fulfilled" && waResult.value.sent
      } : undefined
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal kirim OTP" },
      { status: 400 }
    );
  }
}
