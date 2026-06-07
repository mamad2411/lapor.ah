import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsSession } from "@/lib/superadmin/session";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase/admin";
import { logOpsAudit } from "@/lib/superadmin/auth";

export const runtime = "nodejs";

const schema = z.object({
  reason: z.string().min(5),
  type: z.enum(["immediate", "schedule"]).default("schedule"),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await requireOpsSession(req);
    const { uid } = await params;
    const body = schema.parse(await req.json());

    const userRef = adminDb().collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 });
    }

    const data = userDoc.data()!;
    if (data.roles !== "ADMIN") {
      return NextResponse.json({ error: "Bukan akun admin desa" }, { status: 400 });
    }

    if (body.type === "schedule") {
      await userRef.update({
        deletionPendingAt: FieldValue.serverTimestamp(),
        deletionScheduledBy: session.email,
        deletedReason: body.reason,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logOpsAudit({
        action: "schedule_delete_admin",
        actorUid: session.uid,
        actorEmail: session.email,
        targetType: "admin_user",
        targetId: uid,
        details: { reason: body.reason, email: data.email, villageName: data.villageName },
      });

      return NextResponse.json({ ok: true, scheduled: true });
    }

    // Immediate deletion logic
    await adminAuth().updateUser(uid, { disabled: true });
    await userRef.update({
      status: "deleted",
      deletedReason: body.reason,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: session.email,
      // Clear scheduling flags if any
      deletionPendingAt: FieldValue.delete(),
      deletionScheduledBy: FieldValue.delete(),
    });

    await logOpsAudit({
      action: "delete_admin",
      actorUid: session.uid,
      actorEmail: session.email,
      targetType: "admin_user",
      targetId: uid,
      details: { reason: body.reason, email: data.email, villageName: data.villageName },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus admin";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 400 });
  }
}

const postSchema = z.object({
  action: z.enum(["ban", "unban"]),
  years: z.number().nonnegative().default(0),
  months: z.number().nonnegative().default(0),
  days: z.number().nonnegative().default(0),
  reason: z.string().min(5).optional(),
  proofUrl: z.string().min(5).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const session = await requireOpsSession(req);
    const { uid } = await params;
    const body = postSchema.parse(await req.json());

    const userRef = adminDb().collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 });
    }

    const data = userDoc.data()!;
    if (data.roles !== "ADMIN") {
      return NextResponse.json({ error: "Bukan akun admin desa" }, { status: 400 });
    }

    if (body.action === "ban") {
      if (!body.reason || body.reason.trim().length < 5) {
        return NextResponse.json({ error: "Alasan minimal 5 karakter" }, { status: 400 });
      }
      if (!body.proofUrl) {
        return NextResponse.json({ error: "Dokumen bukti/foto wajib diunggah" }, { status: 400 });
      }
      if (body.years === 0 && body.months === 0 && body.days === 0) {
        return NextResponse.json({ error: "Durasi banned minimal 1 hari, 1 bulan, atau 1 tahun" }, { status: 400 });
      }

      const now = new Date();
      const bannedUntil = new Date();
      if (body.years) bannedUntil.setFullYear(bannedUntil.getFullYear() + body.years);
      if (body.months) bannedUntil.setMonth(bannedUntil.getMonth() + body.months);
      if (body.days) bannedUntil.setDate(bannedUntil.getDate() + body.days);

      const banInfo = {
        bannedAt: now.toISOString(),
        bannedUntil: bannedUntil.toISOString(),
        reason: body.reason,
        proofUrl: body.proofUrl,
        bannedBy: session.email,
      };

      await userRef.update({
        status: "banned",
        banInfo,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logOpsAudit({
        action: "ban_admin",
        actorUid: session.uid,
        actorEmail: session.email,
        targetType: "admin_user",
        targetId: uid,
        details: { banInfo, email: data.email, villageName: data.villageName },
      });

      return NextResponse.json({ ok: true, bannedUntil: bannedUntil.toISOString() });
    } else if (body.action === "unban") {
      await userRef.update({
        status: "active",
        banInfo: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await logOpsAudit({
        action: "unban_admin",
        actorUid: session.uid,
        actorEmail: session.email,
        targetType: "admin_user",
        targetId: uid,
        details: { email: data.email, villageName: data.villageName },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memproses aksi";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 400 });
  }
}
