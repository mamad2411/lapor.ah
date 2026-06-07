import { adminAuth, adminDb, FieldValue } from "@/lib/firebase/admin";
import { markTokenUsed } from "@/lib/access-token";
import { requireBothOtpVerified } from "@/lib/otp-store";
import { normalizePhone } from "@/lib/phone";
import { isVillageLocationTaken } from "@/lib/village-duplicate";
import { sendRegistrationApprovedEmail } from "@/lib/mail";
import { sendRegistrationApprovedWhatsApp } from "@/lib/whatsapp";
import { buildAdminPanelUrl } from "@/lib/admin/build-admin-url";

type PendingRegistration = {
  token: string;
  nik: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  villageName: string;
  latitude: string;
  longitude: string;
  position: string;
  profileImage?: string | null;
  villageThumbnail?: string | null;
  approvalDocument?: string | null;
  documentVerification?: Record<string, unknown> | null;
  security?: { enable2FA: boolean; totpSecret?: string; dataSupport: boolean; visitorId?: string };
  backupCodesHashed?: { hash: string; salt: string }[];
  backupCodesPlain?: string[] | null;
};

export async function completeRegistration(
  registrationId: string,
  pending: PendingRegistration,
  options: { skipOtpCheck?: boolean } = {}
): Promise<{ uid: string; adminToken: string; finalAccessToken: string; adminUrl: string }> {
  const duplicate = await isVillageLocationTaken(
    pending.villageName,
    pending.latitude,
    pending.longitude,
    { excludeRegistrationId: registrationId }
  );
  if (duplicate.taken) {
    throw new Error(duplicate.message || "Desa sudah terdaftar");
  }

  if (!options.skipOtpCheck) {
    const otpCheck = await requireBothOtpVerified(pending.token, "register");
    if (!otpCheck.ok) {
      throw new Error(otpCheck.error);
    }
  }

  const email = pending.email.toLowerCase().trim();
  const phone = normalizePhone(pending.phone);

  const villageSlug = pending.villageName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const adminToken = `ADM-${villageSlug}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const finalAccessToken = `FINAL-${villageSlug}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  let userRecord;
  try {
    userRecord = await adminAuth().createUser({
      email,
      password: pending.password,
      displayName: pending.name,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      throw new Error("Email sudah terdaftar di Firebase. Hapus akun lama atau gunakan email lain.");
    }
    throw err;
  }

  const adminUrl = buildAdminPanelUrl({
    uid: userRecord.uid,
    villageName: pending.villageName,
    latitude: pending.latitude,
    longitude: pending.longitude,
    adminToken,
  });

  await adminDb().collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    nik: pending.nik,
    name: pending.name,
    email,
    phone,
    villageName: pending.villageName,
    latitude: pending.latitude,
    longitude: pending.longitude,
    position: pending.position,
    profileImage: pending.profileImage ?? null,
    villageThumbnail: pending.villageThumbnail ?? null,
    approvalDocument: pending.approvalDocument ?? null,
    documentVerification: pending.documentVerification ?? null,
    adminToken,
    finalAccessToken,
    adminUrl,
    settings: {
      kecamatan: "",
      kabupaten: "",
      slaJam: "72",
      notifEmail: true,
      notifWa: true,
      catatan: "",
    },
    security: pending.security || { enable2FA: false, dataSupport: true },
    backupCodesHashed: pending.backupCodesHashed ?? [],
    roles: "ADMIN",
    status: "active",
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  });

  await markTokenUsed(pending.token);

  await adminDb().collection("pending_registrations").doc(registrationId).update({
    status: "approved",
    uid: userRecord.uid,
    adminToken,
    finalAccessToken,
    adminUrl,
    approvedAt: FieldValue.serverTimestamp(),
    backupCodesPlain: FieldValue.delete(),
  });

  const tokens = { adminToken, finalAccessToken, adminUrl };

  await sendRegistrationApprovedEmail(
    email,
    pending.name,
    pending.villageName,
    tokens,
    pending.backupCodesPlain ?? undefined
  ).catch(() => {});
  await sendRegistrationApprovedWhatsApp(phone, pending.villageName, tokens).catch(() => {});

  return { uid: userRecord.uid, adminToken, finalAccessToken, adminUrl };
}
