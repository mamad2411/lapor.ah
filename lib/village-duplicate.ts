import { adminDb } from "@/lib/firebase/admin";

export function normalizeCoordinate(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "";
  return num.toFixed(4);
}

export async function isVillageLocationTaken(
  villageName: string,
  latitude: string,
  longitude: string,
  options?: { excludeUid?: string; excludeRegistrationId?: string }
): Promise<{ taken: boolean; message?: string }> {
  const excludeUid = options?.excludeUid;
  const excludeRegistrationId = options?.excludeRegistrationId;
  const lat = normalizeCoordinate(latitude);
  const lng = normalizeCoordinate(longitude);

  if (!villageName.trim() || !lat || !lng) {
    return { taken: false };
  }

  const usersRef = adminDb().collection("users");
  const sameNameDocs = await usersRef.where("villageName", "==", villageName.trim()).get();

  for (const doc of sameNameDocs.docs) {
    if (excludeUid && doc.id === excludeUid) continue;
    const data = doc.data();
    if (
      normalizeCoordinate(data.latitude) === lat &&
      normalizeCoordinate(data.longitude) === lng
    ) {
      return {
        taken: true,
        message: `Desa ${villageName} dengan lokasi tersebut sudah terdaftar.`,
      };
    }
  }

  const pendingRef = adminDb().collection("pending_registrations");
  const pendingSnap = await pendingRef
    .where("villageName", "==", villageName.trim())
    .where("status", "==", "pending_superadmin")
    .get();

  for (const doc of pendingSnap.docs) {
    if (excludeRegistrationId && doc.id === excludeRegistrationId) continue;
    const data = doc.data();
    if (
      normalizeCoordinate(data.latitude) === lat &&
      normalizeCoordinate(data.longitude) === lng
    ) {
      return {
        taken: true,
        message: `Desa ${villageName} dengan lokasi tersebut sedang dalam proses pendaftaran.`,
      };
    }
  }

  return { taken: false };
}
