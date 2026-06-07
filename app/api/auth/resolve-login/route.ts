import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLoginAccount } from "@/lib/repair-user-account";

export const runtime = "nodejs";

const schema = z.object({
  identifier: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    const { identifier } = schema.parse(await req.json());
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
