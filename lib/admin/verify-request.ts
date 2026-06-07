import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function verifyAdminRequest(req: Request, villageId?: string | null) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const decoded = await adminAuth().verifyIdToken(authHeader.slice(7));
  const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
  if (!userDoc.exists) throw new Error("Profil tidak ditemukan");

  const data = userDoc.data()!;
  if (data.roles !== "ADMIN" || data.status === "deleted") {
    throw new Error("Bukan akun admin desa");
  }

  if (data.status === "banned") {
    const banInfo = data.banInfo;
    const bannedUntil = banInfo?.bannedUntil;
    if (bannedUntil && new Date(bannedUntil) > new Date()) {
      throw new Error("Akun Anda sedang dibanned oleh superadmin");
    } else {
      await adminDb().collection("users").doc(decoded.uid).update({
        status: "active",
        banInfo: null
      });
      data.status = "active";
      data.banInfo = null;
    }
  }

  if (villageId && villageId !== decoded.uid) {
    throw new Error("ID desa tidak cocok dengan sesi");
  }

  return { uid: decoded.uid, userDoc, data, decoded };
}
