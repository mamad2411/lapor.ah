import { normalizePhone } from "./phone";

/** Kirim pesan via Fonnte (Prioritas jika FONNTE_TOKEN ada) */
async function sendFonnteMessage(phone: string, message: string) {
  // Dukung variasi nama env (Fonnte atau Fannte)
  const token = process.env.FONNTE_TOKEN || process.env.FANNTE_TOKEN;
  
  if (!token) {
    return { sent: false, reason: "Kredensial WhatsApp (Fonnte) belum diset di server" };
  }

  const target = normalizePhone(phone);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token.trim(),
      },
      body: new URLSearchParams({
        target,
        message,
        countryCode: "62",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await res.json();

    if (data.status === true) {
      return { sent: true, id: data.id?.[0] || "fonnte_ok" };
    }

    // Tangani error spesifik dari Fonnte
    const reason = data.reason || "Terjadi kesalahan pada layanan WhatsApp";
    return { sent: false, reason: reason };
  } catch (err) {
    return { sent: false, reason: "Gagal terhubung ke server WhatsApp" };
  }
}

/** Kirim pesan via Green API (Backup jika Fonnte tidak ada) */
async function sendGreenApiMessage(phone: string, message: string) {
  const idInstance = process.env.GREEN_API_ID_INSTANCE;
  const apiToken = process.env.GREEN_API_TOKEN_INSTANCE;

  if (!idInstance || !apiToken) {
    return { sent: false, reason: "GREEN_API credentials tidak diset" };
  }

  const target = normalizePhone(phone);
  // Green API menggunakan format chatId: 62812345678@c.us
  const chatId = `${target}@c.us`;

  const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`;


  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseData = await res.json();

    if (!res.ok) {
      return { sent: false, reason: `Gagal kirim Green API: ${JSON.stringify(responseData)}` };
    }

    return { sent: true, id: responseData.idMessage };
  } catch (err) {
    return { sent: false, reason: "Gagal terhubung ke backup WhatsApp" };
  }
}
/** Kirim pesan WhatsApp (Mencoba Fonnte dulu, baru Green API jika Fonnte tidak diset) */
async function sendWhatsAppMessage(phone: string, message: string) {
  const token = process.env.FONNTE_TOKEN || process.env.FANNTE_TOKEN;
  if (token) {
    return sendFonnteMessage(phone, message);
  }
  return sendGreenApiMessage(phone, message);
}

/** Kirim OTP via WhatsApp */
export async function sendOtpWhatsApp(phone: string, otp: string, purpose: string) {
  const message = `*Lapor.ah*\nKode OTP ${purpose}: *${otp}*\nBerlaku 10 menit. Jangan bagikan kode ini.`;
  return sendWhatsAppMessage(phone, message);
}

export async function sendRegistrationRejectedWhatsApp(
  phone: string,
  villageName: string,
  reason: string,
  rejectionUrl: string,
  rejectionToken: string
) {
  const message = `*Lapor.ah — Pendaftaran Ditolak*\n\nDesa *${villageName}* belum disetujui.\n\n*Alasan:* ${reason}\n\n*Token Penolakan:* ${rejectionToken}\n\nDetail:\n${rejectionUrl}`;
  return sendWhatsAppMessage(phone, message);
}

export async function sendRegistrationApprovedWhatsApp(
  phone: string,
  villageName: string,
  tokens: { adminToken: string; finalAccessToken: string; adminUrl: string }
) {
  const message = `*Lapor.ah — Pendaftaran Disetujui*\n\nDesa *${villageName}* telah diverifikasi superadmin.\n\n*Token Admin:* ${tokens.adminToken}\n*Token Final:* ${tokens.finalAccessToken}\n\nPanel Admin:\n${tokens.adminUrl}\n\nSilakan masuk dengan email & password pendaftaran Anda.`;
  return sendWhatsAppMessage(phone, message);
}
