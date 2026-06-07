import { NextResponse } from "next/server";
import { requireOpsSession, revokeOpsSession, getCookieName } from "@/lib/superadmin/session";
import { logOpsAudit } from "@/lib/superadmin/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await requireOpsSession(req);
    await revokeOpsSession(session.sid);
    await logOpsAudit({
      action: "logout",
      actorUid: session.uid,
      actorEmail: session.email,
      targetType: "session",
      targetId: session.sid,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(getCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(getCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }
}
