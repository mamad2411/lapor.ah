import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, FieldValue } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const voteSchema = z.object({
  optionId: z.string().min(1),
  voterKey: z.string().min(8).max(64),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const body = voteSchema.parse(await req.json());

    const postRef = adminDb().collection("diskusi_posts").doc(postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Posting tidak ditemukan" }, { status: 404 });
    }

    const poll = postDoc.data()?.poll;
    if (!poll?.options?.length) {
      return NextResponse.json({ error: "Posting ini tidak punya polling" }, { status: 400 });
    }

    if (poll.endsAt?.toDate?.() && poll.endsAt.toDate() < new Date()) {
      return NextResponse.json({ error: "Polling sudah berakhir" }, { status: 400 });
    }

    const optionIndex = poll.options.findIndex((o: { id: string }) => o.id === body.optionId);
    if (optionIndex < 0) {
      return NextResponse.json({ error: "Opsi tidak valid" }, { status: 400 });
    }

    const voteRef = adminDb().collection("diskusi_poll_votes").doc(`${postId}_${body.voterKey}`);
    const existing = await voteRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: "Kamu sudah memilih di polling ini" }, { status: 409 });
    }

    const updatedOptions = poll.options.map((o: { id: string; text: string; votes: number }, i: number) =>
      i === optionIndex ? { ...o, votes: (o.votes || 0) + 1 } : o
    );

    await adminDb().runTransaction(async (tx) => {
      tx.set(voteRef, {
        postId,
        optionId: body.optionId,
        voterKey: body.voterKey,
        votedAt: FieldValue.serverTimestamp(),
      });
      tx.update(postRef, {
        poll: {
          ...poll,
          options: updatedOptions,
          totalVotes: (poll.totalVotes || 0) + 1,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      poll: {
        ...poll,
        options: updatedOptions,
        totalVotes: (poll.totalVotes || 0) + 1,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memilih opsi" },
      { status: 400 }
    );
  }
}
