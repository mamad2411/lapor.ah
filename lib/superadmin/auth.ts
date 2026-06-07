import { adminAuth, adminDb, FieldValue } from "@/lib/firebase/admin";

export async function verifySuperadminIdToken(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const userDoc = await adminDb().collection("users").doc(decoded.uid).get();

  if (!userDoc.exists) {
    throw new Error("Akun tidak ditemukan");
  }

  const data = userDoc.data()!;
  if (data.roles !== "SUPERADMIN" || data.status === "deleted") {
    throw new Error("Bukan akun superadmin");
  }

  return {
    uid: decoded.uid,
    email: (data.email as string) || decoded.email || "",
    name: (data.name as string) || "Superadmin",
  };
}

export async function superadminExists(): Promise<boolean> {
  const snap = await adminDb()
    .collection("users")
    .where("roles", "==", "SUPERADMIN")
    .limit(1)
    .get();
  return !snap.empty;
}

export async function provisionSuperadmin(params: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = params.email.toLowerCase().trim();

  const existing = await adminDb()
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new Error("Email sudah terdaftar");
  }

  const userRecord = await adminAuth().createUser({
    email,
    password: params.password,
    displayName: params.name || "Superadmin Lapor.ah",
  });

  await adminAuth().setCustomUserClaims(userRecord.uid, { role: "SUPERADMIN" });

  await adminDb()
    .collection("users")
    .doc(userRecord.uid)
    .set({
      uid: userRecord.uid,
      email,
      name: params.name || "Superadmin",
      roles: "SUPERADMIN",
      status: "active",
      createdAt: new Date().toISOString(),
    });

  return { uid: userRecord.uid, email };
}

export async function logOpsAudit(params: {
  action: string;
  actorUid: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}) {
  await adminDb()
    .collection("ops_audit_log")
    .add({
      ...params,
      at: FieldValue.serverTimestamp(),
    });
}
