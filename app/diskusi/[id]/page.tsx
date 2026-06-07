"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WargaShell } from "@/components/warga/warga-shell";
import { DiskusiPostCard } from "@/components/warga/diskusi-post-card";
import { DiskusiReplyThread } from "@/components/warga/diskusi-reply-thread";
import { Button } from "@/components/ui/button";
import type { DiskusiPost } from "@/lib/warga/types";
import { Spinner } from "@/components/ui/spinner";

export default function DiskusiThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [post, setPost] = useState<DiskusiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyCount, setReplyCount] = useState(0);

  useEffect(() => {
    fetch(`/api/diskusi/posts/${id}`)
      .then((r) => {
        if (!r.ok) {
          return r.text().then(text => {
            let errMsg = "Gagal memuat posting";
            try {
              const parsed = JSON.parse(text);
              errMsg = parsed.error || errMsg;
            } catch {}
            throw new Error(errMsg);
          });
        }
        return r.json();
      })
      .then((d) => {
        if (d.post) {
          setPost(d.post);
          setReplyCount(d.post.replyCount);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat thread:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <WargaShell wide>
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-4" asChild>
          <Link href="/diskusi">
            <ArrowLeft className="w-4 h-4" /> Kembali ke komunitas
          </Link>
        </Button>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
          Thread Diskusi
        </p>
        <h1 className="font-display text-2xl lg:text-3xl tracking-tight">
          {loading ? "Memuat..." : `Posting #${id.slice(0, 8)}`}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" text="Memuat postingan..." />
        </div>
      ) : !post ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">Posting tidak ditemukan</p>
          <Button onClick={() => router.push("/diskusi")}>Ke halaman diskusi</Button>
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <DiskusiPostCard
            post={{ ...post, replyCount }}
            variant="thread"
            onTagClick={(tag) => router.push(`/diskusi?tag=${tag}`)}
          />
          <div>
            <h2 className="text-sm font-medium mb-3">
              {replyCount} Balasan
            </h2>
            <DiskusiReplyThread postId={id} adminRating={post.adminRating ?? undefined} onReplyCountChange={setReplyCount} />
          </div>
        </div>
      )}
    </WargaShell>
  );
}
