import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken } from "@/lib/access-token";
import { checkOtp } from "@/lib/otp-store";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16),
  channel: z.enum(["email", "phone"]),
  code: z.string().length(6),
  purpose: z.enum(["register", "reset"]).default("register"),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());


    // Only check token exists — do NOT enforce used:false here.
    // The OTP doc itself has its own expiry/verified checks.
    const tokenData = await getAccessToken(body.token);
    if (!tokenData) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 400 });
    }
    if (tokenData.type !== body.purpose) {
      return NextResponse.json({ error: "Jenis token tidak sesuai" }, { status: 400 });
    }

    const result = await checkOtp({
      purpose: body.purpose,
      token: body.token,
      channel: body.channel,
      code: body.code,
    });


    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ verified: true, channel: body.channel });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verifikasi OTP gagal" },
      { status: 400 }
    );
  }
}
