"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, Trash2, Hash, Eye, MapPin, MessageSquare,
  Image as ImageIcon, Music, Mic, BarChart3, ChevronRight, X, ExternalLink, CornerDownRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type Reply = {
  id: string;
  postId: string;
  parentReplyId?: string;
  authorAlias: string;
  content: string;
  isAdmin?: boolean;
  adminName?: string;
  createdAt: string;
};

type Post = {
  id: string;
  authorAlias: string;
  content: string;
  hashtags: string[];
  taggedAdmins: string[];
  villageName: string;
  replyCount: number;
  media: { type: "image" | "video" | "voice"; url: string; bgMusic?: string }[];
  poll?: { question: string; options: { id: string; text: string; votes: number }[]; totalVotes: number };
  adminRating?: { note: string; ratedBy: string };
  createdAt: string;
  deletedAt?: string | null;
};

export default function OpsDiskusiPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Preview state
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const load = () => {
    fetch("/api/ops/v1/diskusi")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openPreview = async (post: Post) => {
    setPreviewPost(post);
    setReplies([]);
    setLoadingReplies(true);
    try {
      const res = await fetch(`/api/diskusi/posts/${post.id}/replies`);
      const data = await res.json();
      setReplies(data.replies || []);
    } finally {
      setLoadingReplies(false);
    }
  };

  async function handleDelete(id: string) {
    if (reason.length < 5) { toast.error("Alasan minimal 5 karakter"); return; }
    setProcessing(true);
    try {
      const res = await fetch(`/api/ops/v1/diskusi/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Posting dihapus");
      setDeleteId(null);
      setReason("");
      if (previewPost?.id === id) setPreviewPost(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" text="Memuat postingan..." /></div>;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        label="Moderasi"
        title="Diskusi Masyarakat"
        description="Preview lengkap & hapus postingan yang melanggar aturan komunitas."
      />

      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Tidak ada posting aktif</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3">
              {/* Header */}
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{p.authorAlias}</span>
                    {p.villageName && (
                      <Badge variant="outline" className="text-[10px] gap-1 rounded-full">
                        <MapPin className="w-2.5 h-2.5" />{p.villageName}
                      </Badge>
                    )}
                    {p.media.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] gap-1 rounded-full">
                        <ImageIcon className="w-2.5 h-2.5" />{p.media.length} media
                      </Badge>
                    )}
                    {p.poll && (
                      <Badge variant="secondary" className="text-[10px] gap-1 rounded-full">
                        <BarChart3 className="w-2.5 h-2.5" />Poll
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    #{p.id.slice(0, 8)} · {p.replyCount} balasan · {new Date(p.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Content preview */}
              <p className="text-sm whitespace-pre-wrap line-clamp-3 text-muted-foreground">{p.content}</p>

              {p.hashtags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {p.hashtags.map((h) => (
                    <Badge key={h} variant="secondary" className="text-[10px]"><Hash className="w-2.5 h-2.5 mr-0.5" />{h}</Badge>
                  ))}
                </div>
              )}

              {p.adminRating?.note && (
                <div className="text-xs bg-primary/5 border-l-2 border-primary px-3 py-2 rounded-r-lg">
                  <span className="font-bold text-primary">Tanggapan Admin:</span> {p.adminRating.note}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => openPreview(p)}>
                  <Eye className="w-3.5 h-3.5" /> Preview Lengkap
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </Button>

                {deleteId === p.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Textarea
                      placeholder="Alasan penghapusan..."
                      rows={1}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-8 py-1 text-xs resize-none"
                    />
                    <Button size="sm" variant="destructive" disabled={processing} onClick={() => handleDelete(p.id)}>
                      {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDeleteId(null); setReason(""); }}>Batal</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 gap-1.5 ml-auto" onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Sheet */}
      <Sheet open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {previewPost && (
            <>
              <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-base">Preview Postingan</SheetTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                      <Link href={`/diskusi/${previewPost.id}`} target="_blank">
                        <ExternalLink className="w-3.5 h-3.5" /> Lihat Postingan
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewPost(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-sm font-semibold">{previewPost.authorAlias}</span>
                  {previewPost.villageName && (
                    <Badge variant="outline" className="text-[10px] gap-1 rounded-full">
                      <MapPin className="w-2.5 h-2.5" />{previewPost.villageName}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(previewPost.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              </SheetHeader>

              <div className="p-6 space-y-6">
                {/* Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewPost.content}</p>

                {/* Hashtags */}
                {previewPost.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {previewPost.hashtags.map((h) => (
                      <span key={h} className="text-xs font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-md">#{h}</span>
                    ))}
                  </div>
                )}

                {/* Tagged admins */}
                {previewPost.taggedAdmins?.length > 0 && (
                  <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tag Admin:</span>
                    {previewPost.taggedAdmins.map((a) => (
                      <span key={a} className="text-xs font-semibold text-primary">@{a}</span>
                    ))}
                  </div>
                )}

                {/* Media */}
                {previewPost.media.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Media</p>
                    <div className={cn("grid gap-2", previewPost.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                      {previewPost.media.map((m, i) => (
                        <div key={i} className="rounded-xl overflow-hidden border bg-black aspect-video flex items-center justify-center">
                          {m.type === "video" ? (
                            <video src={m.url} controls className="w-full h-full object-contain" />
                          ) : m.type === "voice" ? (
                            <div className="flex flex-col items-center gap-3 p-4 text-primary w-full">
                              <Mic className="w-8 h-8 opacity-60" />
                              <audio src={m.url} controls className="w-full" />
                            </div>
                          ) : (
                            <img src={m.url} alt="" className="w-full h-full object-contain" />
                          )}
                        </div>
                      ))}
                    </div>
                    {previewPost.media.some((m) => m.bgMusic) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl">
                        <Music className="w-3.5 h-3.5" />
                        <span>Backsound: {previewPost.media.find((m) => m.bgMusic)?.bgMusic}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Poll */}
                {previewPost.poll && (
                  <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-dashed">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5" /> Polling · {previewPost.poll.totalVotes} suara
                    </p>
                    <p className="text-sm font-semibold">{previewPost.poll.question}</p>
                    <div className="space-y-1.5">
                      {previewPost.poll.options.map((opt) => {
                        const pct = previewPost.poll!.totalVotes > 0
                          ? Math.round((opt.votes / previewPost.poll!.totalVotes) * 100) : 0;
                        return (
                          <div key={opt.id} className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span>{opt.text}</span>
                              <span className="font-bold">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tanggapan admin */}
                {previewPost.adminRating?.note && (
                  <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-xl">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Tanggapan Resmi Desa</p>
                    <p className="text-sm leading-relaxed">{previewPost.adminRating.note}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">— {previewPost.adminRating.ratedBy}</p>
                  </div>
                )}

                {/* Replies */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Balasan ({replies.length})
                  </p>
                  {loadingReplies ? (
                    <div className="flex justify-center py-4"><Spinner size="sm" text="Memuat balasan..." /></div>
                  ) : replies.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Belum ada balasan</p>
                  ) : (
                    <div className="space-y-2">
                      {replies.map((r) => (
                        <div key={r.id} className={cn(
                          "rounded-lg p-3 text-sm space-y-1",
                          r.isAdmin ? "bg-primary/5 border border-primary/20" : "bg-muted/40"
                        )}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs">{r.isAdmin ? (r.adminName || "Admin Desa") : r.authorAlias}</span>
                            {r.isAdmin && (
                              <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground rounded-full">
                                ✓ Admin Desa
                              </Badge>
                            )}
                            {r.parentReplyId ? (
                              (() => {
                                const parent = replies.find(x => x.id === r.parentReplyId);
                                return (
                                  <span className="text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                    <span>↳</span> membalas {parent ? `@${parent.isAdmin ? (parent.adminName || "Admin Desa") : parent.authorAlias}` : "warga"}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-[10px] text-muted-foreground bg-muted/45 px-2 py-0.5 rounded-full font-medium">
                                membalas postingan
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {new Date(r.createdAt).toLocaleString("id-ID")}
                            </span>
                          </div>
                          {r.content && <p className="whitespace-pre-wrap text-xs leading-relaxed">{r.content}</p>}

                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete action */}
                <div className="pt-4 border-t">
                  {deleteId === previewPost.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Alasan penghapusan (pelanggaran SOP, hoax, spam, dll.)"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" disabled={processing} onClick={() => handleDelete(previewPost.id)}>
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                          Konfirmasi Hapus
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDeleteId(null); setReason(""); }}>Batal</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="text-destructive w-full gap-2" onClick={() => setDeleteId(previewPost.id)}>
                      <Trash2 className="w-4 h-4" /> Hapus Postingan Ini
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
