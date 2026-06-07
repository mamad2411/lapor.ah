import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAdminRequest } from "@/lib/admin/verify-request";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get("accessToken");
    if (!accessToken) {
      return NextResponse.json({ error: "Token akses dokumen wajib" }, { status: 400 });
    }

    const { uid, data } = await verifyAdminRequest(req);

    const accessDoc = await adminDb().collection("document_access").doc(accessToken).get();
    if (!accessDoc.exists) {
      return NextResponse.json({ error: "Sesi akses dokumen tidak valid" }, { status: 403 });
    }

    const access = accessDoc.data()!;
    if (access.uid !== uid) {
      return NextResponse.json({ error: "Token akses tidak cocok" }, { status: 403 });
    }
    if (access.expiresAt?.toMillis?.() < Date.now()) {
      return NextResponse.json({ error: "Sesi akses dokumen kedaluwarsa" }, { status: 403 });
    }

    const docPath = data.approvalDocument as string | null;
    if (!docPath || !docPath.startsWith("/registrations/")) {
      return NextResponse.json({ error: "Dokumen pengesahan tidak tersedia" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", docPath.replace(/^\//, ""));
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuka dokumen";
    const status = msg === "Unauthorized" ? 401 : msg.includes("ENOENT") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
