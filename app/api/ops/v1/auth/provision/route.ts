import { NextResponse } from "next/server";
import { z } from "zod";
import { provisionSuperadmin, superadminExists } from "@/lib/superadmin/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(2).optional(),
  bootstrapSecret: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const secret = process.env.SUPERADMIN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "SUPERADMIN_SECRET belum dikonfigurasi" }, { status: 500 });
    }

    const body = schema.parse(await req.json());
    if (body.bootstrapSecret !== secret) {
      return NextResponse.json({ error: "Secret bootstrap tidak cocok. Periksa .env" }, { status: 401 });
    }

    const exists = await superadminExists();
    if (exists) {
      return NextResponse.json(
        { error: "Superadmin sudah terdaftar di database." },
        { status: 409 }
      );
    }

    const result = await provisionSuperadmin({
      email: body.email,
      password: body.password,
      name: body.name,
    });

    return NextResponse.json({
      ok: true,
      message: "Superadmin dibuat di Firebase Auth + Firestore users",
      uid: result.uid,
      email: result.email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Provision gagal" },
      { status: 400 }
    );
  }
}
