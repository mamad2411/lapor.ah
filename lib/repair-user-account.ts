import type { DocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { normalizePhone, isEmail } from "@/lib/phone";
import { buildAdminPanelUrl } from "@/lib/admin/build-admin-url";

function resolveAdminUrl(uid: string, data: Record<string, unknown>) {
  const adminToken = String(data.adminToken || "");
  const stored = data.adminUrl as string | undefined;
  if (stored?.includes("token=")) return stored;
  if (!adminToken) return stored || "";
  return buildAdminPanelUrl({
    uid,
    villageName: String(data.villageName || ""),
    latitude: String(data.latitude || ""),
    longitude: String(data.longitude || ""),
    adminToken,
  });
}

function mapUserDoc(doc: DocumentSnapshot) {
  const data = doc.data()!;
  const adminToken = String(data.adminToken || "");
  const security = data.security as { enable2FA?: boolean } | undefined;
  return {
    email: data.email as string,
    uid: doc.id,
    villageName: (data.villageName as string) || "",
    latitude: (data.latitude as string) || "",
    longitude: (data.longitude as string) || "",
    roles: (data.roles as string) || "ADMIN",
    adminToken,
    adminUrl: resolveAdminUrl(doc.id, data),
    requires2FA: Boolean(security?.enable2FA),
  };
}

async function rebuildUsersDocFromPending(
  uid: string,
  pending: Record<string, unknown>
): Promise<DocumentSnapshot | null> {
  const email = String(pending.email || "").toLowerCase().trim();
  if (!email) return null;

  const adminToken = String(pending.adminToken || "");
  const adminUrl = adminToken
    ? buildAdminPanelUrl({
        uid,
        villageName: String(pending.villageName || ""),
        latitude: String(pending.latitude || ""),
        longitude: String(pending.longitude || ""),
        adminToken,
      })
    : null;

  await adminDb()
    .collection("users")
    .doc(uid)
    .set({
      uid,
      nik: pending.nik || "",
      name: pending.name || "",
      email,
      phone: normalizePhone(String(pending.phone || "")),
      villageName: pending.villageName || "",
      latitude: pending.latitude || "",
      longitude: pending.longitude || "",
      position: pending.position || "",
      profileImage: pending.profileImage ?? null,
      villageThumbnail: pending.villageThumbnail ?? null,
      approvalDocument: pending.approvalDocument ?? null,
      documentVerification: pending.documentVerification ?? null,
      adminToken: adminToken || null,
      finalAccessToken: pending.finalAccessToken || null,
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
      backupCodesHashed: pending.backupCodesHashed || [],
      roles: "ADMIN",
      status: "active",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      repairedAt: new Date().toISOString(),
    });

  const repaired = await adminDb().collection("users").doc(uid).get();
  return repaired.exists ? repaired : null;
}

async function findApprovedPending(identifier: string) {
  const trimmed = identifier.trim();
  const db = adminDb();

  if (trimmed.startsWith("ADM-")) {
    const snap = await db
      .collection("pending_registrations")
      .where("adminToken", "==", trimmed)
      .limit(5)
      .get();
    return snap.docs.find((d) => d.data().status === "approved") || null;
  }

  if (trimmed.startsWith("FINAL-")) {
    const snap = await db
      .collection("pending_registrations")
      .where("finalAccessToken", "==", trimmed)
      .limit(5)
      .get();
    return snap.docs.find((d) => d.data().status === "approved") || null;
  }

  if (isEmail(trimmed)) {
    const email = trimmed.toLowerCase();
    const snap = await db
      .collection("pending_registrations")
      .where("email", "==", email)
      .limit(10)
      .get();
    const approved = snap.docs
      .filter((d) => d.data().status === "approved")
      .sort((a, b) => {
        const ta = a.data().approvedAt?.toMillis?.() || 0;
        const tb = b.data().approvedAt?.toMillis?.() || 0;
        return tb - ta;
      });
    if (approved.length > 0) return approved[0];
  }

  const phone = normalizePhone(trimmed);
  const variants = [phone, trimmed.replace(/\D/g, "")];
  if (phone.startsWith("62")) variants.push(`0${phone.slice(2)}`);

  for (const p of [...new Set(variants)]) {
    const snap = await db
      .collection("pending_registrations")
      .where("phone", "==", p)
      .limit(5)
      .get();
    const found = snap.docs.find((d) => d.data().status === "approved");
    if (found) return found;
  }

  return null;
}

export async function resolveLoginAccount(identifier: string) {
  const trimmed = identifier.trim();
  const db = adminDb();

  // Token admin / final
  if (trimmed.startsWith("ADM-") || trimmed.startsWith("FINAL-")) {
    const field = trimmed.startsWith("ADM-") ? "adminToken" : "finalAccessToken";
    const byToken = await db.collection("users").where(field, "==", trimmed).limit(1).get();
    if (!byToken.empty) {
      const doc = byToken.docs[0];
      const data = doc.data();
      if (data.status === "deleted") {
        throw new Error("Akun telah dinonaktifkan oleh superadmin.");
      }
      if (data.status === "banned") {
        const banInfo = data.banInfo;
        const bannedUntil = banInfo?.bannedUntil;
        if (bannedUntil && new Date(bannedUntil) > new Date()) {
          throw new Error(`BANNED:${JSON.stringify(banInfo)}`);
        } else {
          await db.collection("users").doc(doc.id).update({
            status: "active",
            banInfo: null
          });
        }
      }
      return mapUserDoc(doc);
    }
  }

  // Email
  if (isEmail(trimmed)) {
    const email = trimmed.toLowerCase();
    const byEmail = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!byEmail.empty) {
      const doc = byEmail.docs[0];
      const data = doc.data();
      if (data.status === "deleted") {
        throw new Error("Akun telah dinonaktifkan oleh superadmin.");
      }
      if (data.status === "banned") {
        const banInfo = data.banInfo;
        const bannedUntil = banInfo?.bannedUntil;
        if (bannedUntil && new Date(bannedUntil) > new Date()) {
          throw new Error(`BANNED:${JSON.stringify(banInfo)}`);
        } else {
          await db.collection("users").doc(doc.id).update({
            status: "active",
            banInfo: null
          });
        }
      }
      return mapUserDoc(doc);
    }

    try {
      const authUser = await adminAuth().getUserByEmail(email);
      const pending = await findApprovedPending(email);
      if (pending?.data()?.uid === authUser.uid || pending) {
        const repaired = await rebuildUsersDocFromPending(
          authUser.uid,
          (pending?.data() as Record<string, unknown>) || { email }
        );
        if (repaired) return mapUserDoc(repaired);
      }
      const userDoc = await db.collection("users").doc(authUser.uid).get();
      if (userDoc.exists) return mapUserDoc(userDoc);
    } catch {
      // not in Firebase Auth
    }
  }

  // Phone (coba beberapa format)
  const phone = normalizePhone(trimmed);
  const phoneVariants = [...new Set([phone, trimmed.replace(/\D/g, ""), phone.startsWith("62") ? `0${phone.slice(2)}` : phone])];

  for (const variant of phoneVariants) {
    if (!variant) continue;
    const byPhone = await db.collection("users").where("phone", "==", variant).limit(1).get();
    if (!byPhone.empty) {
      const doc = byPhone.docs[0];
      const data = doc.data();
      if (data.status === "deleted") {
        throw new Error("Akun telah dinonaktifkan oleh superadmin.");
      }
      if (data.status === "banned") {
        const banInfo = data.banInfo;
        const bannedUntil = banInfo?.bannedUntil;
        if (bannedUntil && new Date(bannedUntil) > new Date()) {
          throw new Error(`BANNED:${JSON.stringify(banInfo)}`);
        } else {
          await db.collection("users").doc(doc.id).update({
            status: "active",
            banInfo: null
          });
        }
      }
      return mapUserDoc(doc);
    }
  }

  // Repair dari pending approved
  const pendingDoc = await findApprovedPending(trimmed);
  if (pendingDoc) {
    const pending = pendingDoc.data();
    const uid = pending.uid as string | undefined;
    if (uid) {
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) return mapUserDoc(userDoc);
      const repaired = await rebuildUsersDocFromPending(uid, pending);
      if (repaired) return mapUserDoc(repaired);
    }

    const email = String(pending.email || "").toLowerCase();
    if (email) {
      try {
        const authUser = await adminAuth().getUserByEmail(email);
        const repaired = await rebuildUsersDocFromPending(authUser.uid, pending);
        if (repaired) {
          await pendingDoc.ref.update({ uid: authUser.uid });
          return mapUserDoc(repaired);
        }
      } catch {
        // auth user missing — approval incomplete
      }
    }
  }

  if (trimmed.startsWith("ADM-") || trimmed.startsWith("FINAL-")) {
    throw new Error(
      "Token bukan untuk login. Gunakan email atau nomor telepon + password saat pendaftaran."
    );
  }

  return null;
}
