import type { DocumentSnapshot, QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { DiskusiPost } from "./types";

export function mapDiskusiPost(
  doc: QueryDocumentSnapshot | DocumentSnapshot
): DiskusiPost {
  const d = doc.data()!;
  const poll = d.poll
    ? {
        question: d.poll.question,
        options: d.poll.options || [],
        totalVotes: d.poll.totalVotes ?? 0,
        endsAt: d.poll.endsAt?.toDate?.()?.toISOString?.() || undefined,
      }
    : undefined;

  const adminRating = d.adminRating
    ? {
        score: d.adminRating.score,
        note: d.adminRating.note || "",
        ratedBy: d.adminRating.ratedBy || "",
        ratedAt: d.adminRating.ratedAt?.toDate?.()?.toISOString?.() || "",
      }
    : undefined;

  return {
    id: doc.id,
    authorAlias: d.authorAlias,
    authorRole: d.authorRole || "warga",
    content: d.content,
    hashtags: d.hashtags || [],
    taggedAdmins: d.taggedAdmins || [],
    villageId: d.villageId || undefined,
    villageName: d.villageName || "",
    media: d.media || [],
    poll,
    replyCount: d.replyCount ?? d.comments ?? 0,
    stickerId: d.stickerId || undefined,
    stickerUrl: d.stickerUrl || undefined,
    stickers: d.stickers || [],
    adminRating,
    createdAt: d.createdAt?.toDate?.()?.toISOString?.() || "",
  };
}
