import { NextResponse } from "next/server";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireOpsSession(req);

    const snap = await adminDb().collection("users").where("roles", "==", "ADMIN").get();

    const admins = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          uid: doc.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          villageName: d.villageName,
          status: d.status || "active",
          createdAt: d.createdAt || "",
          approvedAt: d.approvedAt || "",
          deletedAt: d.deletedAt || null,
          deletedReason: d.deletedReason || null,
          banInfo: d.banInfo || null,
        };
      })
      .sort((a, b) => (a.villageName || "").localeCompare(b.villageName || ""));

    return NextResponse.json({ admins });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
