import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySuperadminIdToken, logOpsAudit } from "@/lib/superadmin/auth";
import { createOpsSession, getCookieName } from "@/lib/superadmin/session";
import { limits } from "@/lib/rate-limit";
import { guardBody } from "@/lib/request-guard";

export const runtime = "nodejs";

const schema = z.object({
  idToken: z.string().min(20),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-client-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  // Rate limit: 5 login attempts per IP per 15 min
  const rl = await limits.login(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Tunggu beberapa menit." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  // Injection guard
  const guard = await guardBody<{ idToken: string }>(req);
  if (guard.error) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = schema.parse(guard.data);
    const ua = req.headers.get("user-agent") || "";

    const admin = await verifySuperadminIdToken(body.idToken);
    const session = await createOpsSession({ uid: admin.uid, email: admin.email, ip, userAgent: ua });

    await logOpsAudit({
      action: "login",
      actorUid: admin.uid,
      actorEmail: admin.email,
      targetType: "session",
      targetId: session.sid,
      details: { ip, ua: ua.slice(0, 120) },
    });

    const res = NextResponse.json({
      ok: true,
      gate: session.nonce,
      redirect: `/ctl/ops/${session.nonce}`,
      email: admin.email,
      name: admin.name,
    });

    res.cookies.set(getCookieName(), session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login gagal" },
      { status: 401 }
    );
  }
}
