import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";
import { notifyAdmin } from "@/lib/notify-admin";

/** Normalisasi teks untuk key trending (lowercase, hapus spasi ekstra) */
function normalizeTrendKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 80);
}

/** Catat pesan ke koleksi pesan_trends (increment counter) */
async function recordTrend(villageId: string, text: string) {
  try {
    const key = `${villageId}__${normalizeTrendKey(text)}`;
    const ref = adminDb().collection("pesan_trends").doc(key);
    await ref.set(
      {
        villageId,
        text: text.slice(0, 120),
        count: FieldValue.increment(1),
        lastAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // silent — jangan ganggu flow utama
  }
}

export const runtime = "nodejs";

const schema = z.object({
  villageId: z.string().min(1),
  villageName: z.string().min(1).default("Desa"),
  sessionId: z.string().nullable().optional(),
  message: z.string().min(1),
});

const DEFAULT_TEMPLATES = [
  {
    keywords: ["jam", "buka", "kantor", "operasional"],
    answer:
      "Kantor desa buka Senin–Jumat pukul 08.00–15.00 WIB. Untuk urusan darurat hubungi petugas jaga desa.",
  },
  {
    keywords: ["sampah", "kebersihan", "buang"],
    answer:
      "Pengaduan sampah dapat dilaporkan via menu Laporan WBS. Tim kebersihan desa akan ditugaskan dalam 1×24 jam.",
  },
  {
    keywords: ["bantuan", "sosial", "rtlh", "rumah"],
    answer:
      "Program bantuan sosial desa dapat diajukan dengan melampirkan dokumen pendukung. Silakan datang ke kantor desa atau lanjutkan chat ini.",
  },
];

function matchTemplate(message: string, templates: { keywords: string[]; answer: string; id?: string }[]) {
  const lower = message.toLowerCase();
  for (const t of templates) {
    if (t.keywords.some((k) => lower.includes(k))) return t;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const now = new Date().toISOString();

    let sessionId = body.sessionId || undefined;
    let threadRef;

    if (sessionId) {
      threadRef = adminDb().collection("pesan_threads").doc(sessionId);
      const existing = await threadRef.get();
      if (!existing.exists) sessionId = undefined;
    }

    if (!sessionId) {
      threadRef = adminDb().collection("pesan_threads").doc();
      sessionId = threadRef.id;
      await threadRef.set({
        villageId: body.villageId,
        villageName: body.villageName,
        messages: [],
        status: "bot",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const thread = (await threadRef!.get()).data()!;
    const messages = [...(thread.messages || [])];
    messages.push({ role: "user", content: body.message, at: now });

    // Catat ke trending (fire-and-forget)
    void recordTrend(body.villageId, body.message);

    let customTemplates: { id: string; keywords: string[]; answer: string }[] = [];
    try {
      const customSnap = await adminDb()
        .collection("reply_templates")
        .where("villageId", "==", body.villageId)
        .where("active", "==", true)
        .get();
      customTemplates = customSnap.docs.map((d) => ({
        id: d.id,
        keywords: d.data().keywords || [],
        answer: d.data().answer || "",
      }));
    } catch {
      // Index belum dibuat atau koleksi kosong — pakai default templates saja
    }

    const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];
    const matched = matchTemplate(body.message, allTemplates);

    let status = thread.status;
    let botReply: string | null = null;

    if (matched) {
      botReply = matched.answer;
      messages.push({
        role: "bot",
        content: botReply,
        at: new Date().toISOString(),
        templateId: matched.id || "default",
      });
      status = "bot";
    } else {
      status = "waiting_admin";
      messages.push({
        role: "bot",
        content:
          "Pesan telah diteruskan ke Admin/Kepala Desa. Mohon tunggu balasan.",
        at: new Date().toISOString(),
      });

      await notifyAdmin({
        villageId: body.villageId,
        type: "pesan",
        title: "Pesan Warga Baru",
        message: body.message.slice(0, 200),
        refId: sessionId!,
      });
    }

    await threadRef!.update({ messages, status, updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({
      sessionId,
      messages,
      status,
      botReply,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengirim pesan" },
      { status: 400 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ messages: [] });

    const doc = await adminDb().collection("pesan_threads").doc(sessionId).get();
    if (!doc.exists) return NextResponse.json({ messages: [] });

    return NextResponse.json({
      sessionId,
      messages: doc.data()?.messages || [],
      status: doc.data()?.status,
    });
  } catch (err) {
    return NextResponse.json({ messages: [] });
  }
}
