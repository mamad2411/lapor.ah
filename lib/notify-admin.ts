import { adminDb, FieldValue } from "@/lib/firebase/admin";
import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user, pass },
  });
}

async function getAdminContact(villageId: string) {
  const doc = await adminDb().collection("users").doc(villageId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    email: data.email as string,
    phone: data.phone as string,
    name: data.name as string,
    villageName: data.villageName as string,
  };
}

export async function createAdminNotification(params: {
  villageId: string;
  type: "laporan" | "diskusi" | "pesan";
  title: string;
  message: string;
  refId: string;
}) {
  await adminDb().collection("admin_notifications").add({
    ...params,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function notifyAdmin(params: {
  villageId: string;
  type: "laporan" | "diskusi" | "pesan";
  title: string;
  message: string;
  refId: string;
}) {
  await createAdminNotification(params);

  const admin = await getAdminContact(params.villageId);
  if (!admin) return;

  const transporter = getTransporter();
  if (transporter) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter
      .sendMail({
        from: `"Lapor.ah" <${from}>`,
        to: admin.email,
        subject: `[${admin.villageName}] ${params.title}`,
        text: params.message,
        html: `<div style="font-family:sans-serif"><h3>${params.title}</h3><p>${params.message}</p><p style="color:#666;font-size:12px">Buka panel admin untuk menindaklanjuti.</p></div>`,
      })
      .catch(() => {});
  }

  const fonnte = process.env.FONNTE_TOKEN;
  if (fonnte && admin.phone) {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: fonnte, "Content-Type": "application/json" },
      body: JSON.stringify({
        target: admin.phone.replace(/^0/, "62"),
        message: `*Lapor.ah — ${admin.villageName}*\n${params.title}\n\n${params.message}`,
        countryCode: "62",
      }),
    }).catch(() => {});
  }
}
