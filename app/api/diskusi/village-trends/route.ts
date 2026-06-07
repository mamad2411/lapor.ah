import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await adminDb()
      .collection("village_mention_counts")
      .orderBy("count", "desc")
      .limit(10)
      .get();

    const villages = snap.docs.map((doc) => ({
      villageName: doc.data().villageName as string,
      count: doc.data().count as number,
      lastMentionAt: doc.data().lastMentionAt?.toDate?.()?.toISOString?.() || "",
    }));

    return NextResponse.json({ villages });
  } catch {
    return NextResponse.json({ villages: [] });
  }
}
