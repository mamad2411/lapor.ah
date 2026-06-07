import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const schema = z.object({
  villageId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.array(z.string()).default([]),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");

    if (!villageId) {
      return NextResponse.json({ templates: [] });
    }

    const snap = await adminDb()
      .collection("reply_templates")
      .where("villageId", "==", villageId)
      .where("active", "==", true)
      .get();

    const templates = snap.docs.map((d) => ({
      id: d.id,
      question: d.data().question,
      answer: d.data().answer,
      keywords: d.data().keywords || [],
    }));

    return NextResponse.json({ templates });
  } catch (err) {
    return NextResponse.json({ templates: [] });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const result = schema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: result.error.format() },
        { status: 400 }
      );
    }

    const body = result.data;
    const ref = adminDb().collection("reply_templates").doc();
    await ref.set({
      ...body,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal simpan" },
      { status: 500 }
    );
  }
}
