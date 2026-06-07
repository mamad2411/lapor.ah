import type { DocumentSnapshot } from "firebase-admin/firestore";
import { buildAdminPanelUrl } from "./build-admin-url";

export interface AdminSettings {
  kecamatan: string;
  kabupaten: string;
  slaJam: string;
  notifEmail: boolean;
  notifWa: boolean;
  catatan: string;
}

export interface AdminSecurity {
  enable2FA: boolean;
  enableBackupCodes: boolean;
  dataSupport: boolean;
  backupCodesRemaining: number;
  hasApprovalDocument: boolean;
  documentVerified: boolean;
}

export interface AdminProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  nik: string;
  position: string;
  villageName: string;
  latitude: string;
  longitude: string;
  profileImage: string | null;
  villageThumbnail: string | null;
  approvalDocument: string | null;
  adminToken: string;
  finalAccessToken: string;
  adminUrl: string;
  settings: AdminSettings;
  security: AdminSecurity;
  deletionPendingAt: string | null;
  deletionScheduledBy: string | null;
}

const defaultSettings = (): AdminSettings => ({
  kecamatan: "",
  kabupaten: "",
  slaJam: "72",
  notifEmail: true,
  notifWa: true,
  catatan: "",
});

export function mapAdminProfile(doc: DocumentSnapshot): AdminProfile {
  const d = doc.data()!;
  const settings = { ...defaultSettings(), ...(d.settings as Partial<AdminSettings> | undefined) };
  const adminToken = String(d.adminToken || "");
  const uid = doc.id;

  return {
    uid,
    name: String(d.name || ""),
    email: String(d.email || ""),
    phone: String(d.phone || ""),
    nik: String(d.nik || ""),
    position: String(d.position || ""),
    villageName: String(d.villageName || ""),
    latitude: String(d.latitude || ""),
    longitude: String(d.longitude || ""),
    profileImage: (d.profileImage as string) || null,
    villageThumbnail: (d.villageThumbnail as string) || null,
    approvalDocument: (d.approvalDocument as string) || null,
    adminToken,
    finalAccessToken: String(d.finalAccessToken || ""),
    adminUrl:
      (d.adminUrl as string) ||
      (adminToken
        ? buildAdminPanelUrl({
            uid,
            villageName: String(d.villageName || ""),
            latitude: String(d.latitude || ""),
            longitude: String(d.longitude || ""),
            adminToken,
          })
        : ""),
    settings,
    security: {
      enable2FA: Boolean((d.security as { enable2FA?: boolean } | undefined)?.enable2FA),
      enableBackupCodes: Boolean((d.security as { enableBackupCodes?: boolean } | undefined)?.enableBackupCodes),
      dataSupport: Boolean((d.security as { dataSupport?: boolean } | undefined)?.dataSupport ?? true),
      backupCodesRemaining: Array.isArray(d.backupCodesHashed)
        ? (d.backupCodesHashed as { used?: boolean }[]).filter((c) => !c.used).length
        : 0,
      hasApprovalDocument: Boolean(d.approvalDocument),
      documentVerified: Boolean((d.documentVerification as { valid?: boolean } | undefined)?.valid),
    },
    deletionPendingAt: d.deletionPendingAt ? (typeof d.deletionPendingAt.toDate === "function" ? d.deletionPendingAt.toDate().toISOString() : String(d.deletionPendingAt)) : null,
    deletionScheduledBy: (d.deletionScheduledBy as string) || null,
  };
}
