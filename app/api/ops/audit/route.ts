import { NextResponse } from "next/server";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, email, details } = body;

    if (!event) {
      return NextResponse.json({ error: "event required" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    await adminDb()
      .collection("audit_logs")
      .add({
        event,
        email: email ?? null,
        details: details ?? {},
        ip,
        userAgent: req.headers.get("user-agent") ?? "unknown",
        timestamp: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Never fail the caller — audit log errors are silent
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
