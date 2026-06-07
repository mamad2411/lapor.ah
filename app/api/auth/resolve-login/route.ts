import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLoginAccount } from "@/lib/repair-user-account";
import { verifyRecaptchaToken } from "@/lib/captcha";

export const runtime = "nodejs";

const schema = z.object({
  identifier: z.string().min(3),
  captchaToken: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { identifier, captchaToken } = schema.parse(await req.json());

    const captchaResult = await verifyRecaptchaToken(
      captchaToken,
      req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined
    );
    
    if (!captchaResult.ok) {
      return NextResponse.json({ error: captchaResult.error || "Verifikasi reCAPTCHA gagal." }, { status: 400 });
    }

    const account = await resolveLoginAccount(identifier);

    if (!account) {
      return NextResponse.json(
        {
          error:
            "Akun tidak ditemukan. Gunakan email atau nomor telepon saat pendaftaran — bukan token ADM/FINAL.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mencari akun";
    if (msg.startsWith("BANNED:")) {
      try {
        const banInfo = JSON.parse(msg.substring(7));
        return NextResponse.json({ error: "banned", banInfo }, { status: 403 });
      } catch {
        return NextResponse.json({ error: "Akun Anda sedang dibanned." }, { status: 403 });
      }
    }
    const status = msg.includes("dinonaktifkan") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
