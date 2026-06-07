import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { mapAdminProfile } from "@/lib/admin/map-profile";

export const runtime = "nodejs";

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const decoded = await adminAuth().verifyIdToken(authHeader.slice(7));
  const userDoc = await adminDb().collection("users").doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.roles !== "ADMIN") throw new Error("Forbidden");
  return userDoc;
}

const settingsSchema = z.object({
  kecamatan: z.string().optional(),
  kabupaten: z.string().optional(),
  slaJam: z.string().optional(),
  notifEmail: z.boolean().optional(),
  notifWa: z.boolean().optional(),
  catatan: z.string().optional(),
  enable2FA: z.boolean().optional(),
  enableBackupCodes: z.boolean().optional(),
  profileImage: z.string().optional(),
  villageThumbnail: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const userDoc = await verifyAdmin(req);
    return NextResponse.json({ profile: mapAdminProfile(userDoc) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const userDoc = await verifyAdmin(req);
    const { enable2FA, enableBackupCodes, profileImage, villageThumbnail, ...settingsBody } = settingsSchema.parse(await req.json());
    
    const currentSettings = userDoc.data()?.settings || {};
    const currentSecurity = userDoc.data()?.security || {};

    const updateData: any = {
      settings: { ...currentSettings, ...settingsBody },
    };

    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }
    if (villageThumbnail !== undefined) {
      updateData.villageThumbnail = villageThumbnail;
    }

    if (enable2FA !== undefined || enableBackupCodes !== undefined) {
      updateData.security = {
        ...currentSecurity,
      };
      if (enable2FA !== undefined) {
        updateData.security.enable2FA = enable2FA;
        if (enable2FA && !currentSecurity.totpSecret) {
          const { generateSecret } = await import("otplib");
          updateData.security.totpSecret = generateSecret();
        }
      }
      if (enableBackupCodes !== undefined) {
        updateData.security.enableBackupCodes = enableBackupCodes;
      }
    }

    await userDoc.ref.update(updateData);

    const updated = await userDoc.ref.get();
    return NextResponse.json({ profile: mapAdminProfile(updated), ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan" },
      { status: 400 }
    );
  }
}
