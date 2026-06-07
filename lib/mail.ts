import nodemailer from "nodemailer";

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP belum dikonfigurasi (SMTP_USER, SMTP_PASS)");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Optimasi koneksi
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
}

export async function sendOtpEmail(to: string, otp: string, purpose: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Lapor.ah" <${from}>`,
    to,
    subject: `Kode OTP Lapor.ah — ${purpose}`,
    text: `Kode OTP Anda: ${otp}\n\nBerlaku 10 menit. Jangan bagikan kode ini.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Lapor.ah</h2>
        <p>Kode OTP untuk <strong>${purpose}</strong>:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold">${otp}</p>
        <p style="color:#666;font-size:14px">Berlaku 10 menit. Jangan bagikan kode ini.</p>
      </div>
    `,
  });
}

export async function sendRegistrationApprovedEmail(
  to: string,
  name: string,
  villageName: string,
  tokens: { adminToken: string; finalAccessToken: string; adminUrl: string },
  backupCodes?: string[]
) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();

  const backupSection = backupCodes?.length
    ? `<div style="margin-top:12px"><strong>Kode Cadangan 2FA:</strong><br/><code>${backupCodes.join("<br/>")}</code></div>`
    : "";

  await transporter.sendMail({
    from: `"Lapor.ah" <${from}>`,
    to,
    subject: `Pendaftaran Desa ${villageName} Disetujui — Lapor.ah`,
    text: `Selamat ${name},\n\nPendaftaran desa ${villageName} telah disetujui.\n\nToken Admin: ${tokens.adminToken}\nToken Final: ${tokens.finalAccessToken}\n\nAkses panel admin:\n${tokens.adminUrl}${backupCodes?.length ? `\n\nKode Cadangan 2FA:\n${backupCodes.join("\n")}` : ""}\n\nSilakan masuk di /masuk dengan email dan password Anda.`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2>Pendaftaran Disetujui ✅</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Pendaftaran desa <strong>${villageName}</strong> telah diverifikasi superadmin.</p>
        <div style="background:#f4f4f4;padding:15px;border-radius:8px;margin:15px 0">
          <p style="margin:0"><strong>Token Admin:</strong> <code>${tokens.adminToken}</code></p>
          <p style="margin:8px 0 0"><strong>Token Final:</strong> <code>${tokens.finalAccessToken}</code></p>
          ${backupSection}
        </div>
        <p><a href="${tokens.adminUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Buka Panel Admin</a></p>
        <p style="color:#666;font-size:13px">Simpan token di atas. Gunakan email dan password saat pendaftaran untuk masuk.</p>
      </div>
    `,
  });
}

export async function sendRegistrationRejectedEmail(
  to: string,
  name: string,
  villageName: string,
  reason: string,
  rejectionUrl: string,
  rejectionToken: string
) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Lapor.ah" <${from}>`,
    to,
    subject: `Pendaftaran Desa ${villageName} Ditolak — Lapor.ah`,
    text: `Halo ${name},\n\nPendaftaran desa ${villageName} ditolak.\n\nAlasan: ${reason}\n\nToken penolakan: ${rejectionToken}\nDetail & langkah selanjutnya:\n${rejectionUrl}\n\nAnda dapat mengajukan ulang setelah memperbaiki persyaratan.`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2>Pendaftaran Ditolak</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Pendaftaran desa <strong>${villageName}</strong> belum dapat disetujui.</p>
        <div style="background:#fff3f3;padding:15px;border-radius:8px;border-left:4px solid #e53e3e;margin:15px 0">
          <p style="margin:0"><strong>Alasan penolakan:</strong></p>
          <p style="margin:8px 0 0">${reason}</p>
        </div>
        <p style="font-size:13px;color:#666">Token penolakan (beda dari token persetujuan): <code>${rejectionToken}</code></p>
        <p><a href="${rejectionUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Lihat detail penolakan</a></p>
        <p style="color:#999;font-size:11px;word-break:break-all">${rejectionUrl}</p>
      </div>
    `,
  });
}

export async function sendAccessLinkEmail(
  to: string,
  link: string,
  type: "register" | "reset",
  villageData?: { name: string; lat: string; lng: string }
) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();
  const label = type === "register" ? "pendaftaran desa" : "reset password";
  
  const villageInfo = villageData ? `
    <div style="background:#f4f4f4;padding:15px;border-radius:8px;margin:15px 0">
      <p style="margin:0"><strong>Nama Desa:</strong> ${villageData.name}</p>
    </div>
  ` : "";

  await transporter.sendMail({
    from: `"Lapor.ah" <${from}>`,
    to,
    subject: `Link ${label} Lapor.ah`,
    text: `Link ${label} (sekali pakai, berlaku 24 jam):\n${link}${villageData ? `\nDesa: ${villageData.name}` : ""}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2>Lapor.ah</h2>
        <p>Permintaan ${label} Anda telah diproses.</p>
        ${villageInfo}
        <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Buka link ${label}</a></p>
        <p style="color:#666;font-size:13px;margin-top:20px">Link hanya bisa dipakai <strong>1 kali</strong> dan kedaluwarsa dalam <strong>24 jam</strong>.</p>
      </div>
    `,
  });
}
