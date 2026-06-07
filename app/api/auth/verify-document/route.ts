import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyDocumentFromUrl } from "@/lib/document-verify";

export const runtime = "nodejs";

const schema = z.object({
  documentUrl: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { documentUrl } = schema.parse(await req.json());

    if (!documentUrl.startsWith("/registrations/")) {
      return NextResponse.json(
        { error: "URL dokumen tidak valid" },
        { status: 400 }
      );
    }

    const result = await verifyDocumentFromUrl(documentUrl);

    return NextResponse.json({
      valid: result.valid,
      score: result.score,
      checks: result.checks,
      fileHash: result.fileHash,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verifikasi gagal" },
      { status: 400 }
    );
  }
}
