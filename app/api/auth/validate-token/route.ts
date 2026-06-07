import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAccessToken } from "@/lib/access-token";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16),
  type: z.enum(["register", "reset"]),
});

export async function POST(req: Request) {
  try {
    const { token, type } = schema.parse(await req.json());
    const result = await validateAccessToken(token, type);
    if (!result.valid || !result.data) {
      return NextResponse.json({ error: result.error || "Token tidak valid" }, { status: 400 });
    }
    const { data } = result;
    let requires2FA = false;
    if (type === "reset") {
      const byEmail = await adminDb()
        .collection("users")
        .where("email", "==", data.email.toLowerCase())
        .limit(1)
        .get();
      if (!byEmail.empty) {
        const sec = byEmail.docs[0].data().security as { enable2FA?: boolean } | undefined;
        requires2FA = Boolean(sec?.enable2FA);
      }
    }
    return NextResponse.json({
      email: data.email,
      phone: data.phone,
      requires2FA,
      nik: data.nik || null,
      name: data.name || null,
      villageName: data.villageName,
      latitude: data.latitude,
      longitude: data.longitude,
      position: data.position,
      type: data.type,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Validasi gagal" },
      { status: 400 }
    );
  }
}
