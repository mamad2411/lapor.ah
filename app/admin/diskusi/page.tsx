"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { SectionHeading } from "@/components/dashboard-admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  MapPin,
  Search,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  ExternalLink,
  X,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DiskusiPollView } from "@/components/warga/diskusi-poll";
import type { DiskusiPost, DiskusiReply } from "@/lib/warga/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function AdminDiskusiContent() {
  const searchParams = useSearchParams();
  const villageId = searchParams.get("id") || "";
  const adminName = searchParams.get("desa") || "Admin";
  const [posts, setPosts] = useState<DiskusiPost[]>([]);
  const [ratingPost, setRatingPost] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "rated" | "unrated" | "tagged">("all");
  const [archiving, setArchiving] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, DiskusiReply[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [previewPost, setPreviewPost] = useState<DiskusiPost | null>(null);
  const [previewReplies, setPreviewReplies] = useState<DiskusiReply[]>([]);
  const [loadingPreviewReplies, setLoadingPreviewReplies] = useState(false);
  const [dialogNote, setDialogNote] = useState("");
  const [dialogEditing, setDialogEditing] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);

  const loadPosts = () => {
    const params = new URLSearchParams({ limit: "50" });
    if (villageId) params.set("villageId", villageId);
    if (adminName && adminName !== "Admin") params.set("villageName", adminName);
    fetch(`/api/diskusi/posts?${params}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []));
  };

  useEffect(() => {
    loadPosts();
  }, [villageId]);

  useEffect(() => {
    if (!previewPost) {
      setPreviewReplies([]);
      setDialogEditing(false);
      setDialogNote("");
      return;
    }
    setLoadingPreviewReplies(true);
    fetch(`/api/diskusi/posts/${previewPost.id}/replies`)
      .then((r) => r.json())
      .then((d) => setPreviewReplies(d.replies || []))
      .catch(() => toast.error("Gagal memuat balasan"))
      .finally(() => setLoadingPreviewReplies(false));
  }, [previewPost]);

  async function submitDialogTanggapan(isEdit = false) {
    if (!previewPost) return;
    if (!dialogNote.trim()) { toast.error("Tulis tanggapan terlebih dahulu"); return; }
    if (!villageId) { toast.error("Buka halaman admin dengan parameter desa"); return; }
    setDialogSaving(true);
    try {
      const res = await fetch("/api/admin/diskusi/ratings", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: previewPost.id, villageId, score: 0, note: dialogNote, ratedBy: adminName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isEdit ? "Tanggapan diperbarui!" : "Tanggapan tersimpan!");
      
      const newRating = { score: 0, note: dialogNote, ratedBy: adminName, ratedAt: new Date().toISOString() };
      setPreviewPost(prev => prev ? { ...prev, adminRating: newRating } : null);
      
      setDialogEditing(false);
      setDialogNote("");
      loadPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setDialogSaving(false); }
  }

  async function submitTanggapan(postId: string, isEdit = false) {
    if (!note.trim()) { toast.error("Tulis tanggapan terlebih dahulu"); return; }
    if (!villageId) { toast.error("Buka halaman admin dengan parameter desa"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/diskusi/ratings", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, villageId, score: 0, note, ratedBy: adminName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isEdit ? "Tanggapan diperbarui!" : "Tanggapan tersimpan!");
      setRatingPost(null); setEditingPost(null); setNote("");
      loadPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  async function arsipkan(postId: string) {
    if (!confirm("Arsipkan posting ini? Warga tidak akan bisa melihatnya lagi.")) return;
    setArchiving(postId);
    try {
      const res = await fetch(`/api/diskusi/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Posting diarsipkan");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengarsipkan");
    } finally { setArchiving(null); }
  }

  async function toggleReplies(postId: string) {
    if (expandedReplies[postId]) {
      setExpandedReplies((prev) => { const n = { ...prev }; delete n[postId]; return n; });
      return;
    }
    setLoadingReplies((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/diskusi/posts/${postId}/replies`);
      const data = await res.json();
      setExpandedReplies((prev) => ({ ...prev, [postId]: data.replies || [] }));
    } catch {
      toast.error("Gagal memuat balasan");
    } finally {
      setLoadingReplies((prev) => { const n = { ...prev }; delete n[postId]; return n; });
    }
  }

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const matchesSearch = p.content.toLowerCase().includes(search.toLowerCase()) ||
        p.authorAlias.toLowerCase().includes(search.toLowerCase()) ||
        p.taggedAdmins?.some((a) => a.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter = filter === "all" ? true :
        filter === "rated" ? !!p.adminRating :
        filter === "unrated" ? !p.adminRating :
        p.taggedAdmins?.length > 0;
      return matchesSearch && matchesFilter;
    });
  }, [posts, search, filter]);

  const stats = useMemo(() => {
    const total = posts.length;
    const rated = posts.filter(p => p.adminRating).length;
    const unrated = total - rated;
    const pollActive = posts.filter(p => p.poll).length;
    const tagged = posts.filter(p => p.taggedAdmins?.length > 0).length;
    return { total, rated, unrated, pollActive, tagged };
  }, [posts]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <SectionHeading
            label="Moderasi Komunitas"
            title="Diskusi & Aspirasi"
            description="Pantau interaksi warga, beri tanggapan resmi desa, dan kelola polling aktif."
          />
          {villageId && (
            <Badge variant="outline" className="self-start md:self-auto h-10 px-4 rounded-xl gap-2 bg-primary/5 text-primary border-primary/20">
              <MapPin className="w-4 h-4" />
              Mode Admin: {adminName}
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: <MessageSquare className="w-5 h-5" />, value: stats.total, label: "Total Diskusi" },
            { icon: <CheckCircle2 className="w-5 h-5" />, value: stats.rated, label: "Sudah Direspon" },
            { icon: <AlertCircle className="w-5 h-5" />, value: stats.unrated, label: "Butuh Respon" },
            { icon: <BarChart3 className="w-5 h-5" />, value: stats.pollActive, label: "Polling Aktif" },
          ].map((s) => (
            <Card key={s.label} className="border border-foreground/10 shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari konten atau nama warga..."
              className="pl-9 h-11 rounded-xl bg-background border-none shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "unrated", "rated", "tagged"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "secondary" : "ghost"}
                className="rounded-xl h-9 px-3 text-xs font-semibold"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Semua" : f === "unrated" ? "Belum Respon" : f === "rated" ? "Sudah Respon" : (
                  <>Tag Admin {stats.tagged > 0 && <span className="ml-1.5 bg-foreground text-background text-[10px] font-mono px-1.5 py-0.5 rounded">{stats.tagged}</span>}</>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Diskusi List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Tidak ada diskusi ditemukan</h3>
              <p className="text-sm text-muted-foreground">Sesuaikan filter atau kata kunci pencarianmu.</p>
            </div>
          ) : (
            filteredPosts.map((p) => (
              <Card key={p.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {p.authorAlias.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{p.authorAlias}</span>
                            {p.villageName && (
                              <Badge variant="outline" className="text-[10px] h-5 rounded-full">
                                {p.villageName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Post #{p.id.slice(0, 8)} · {new Date(p.createdAt).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            className="text-xs gap-2 cursor-pointer"
                            onClick={() => setPreviewPost(p)}
                          >
                            <MessageSquare className="w-4 h-4" /> Lihat Detail (Preview)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs gap-2 cursor-pointer"
                            onClick={() => window.open(`/diskusi/${p.id}`, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" /> Buka Halaman Warga
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs gap-2 text-destructive focus:text-destructive"
                            disabled={archiving === p.id}
                            onClick={() => arsipkan(p.id)}
                          >
                            {archiving === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Arsipkan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>

                    {p.hashtags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {p.hashtags.map((h) => (
                          <span key={h} className="text-[11px] font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                            #{h}
                          </span>
                        ))}
                      </div>
                    )}

                    {p.taggedAdmins?.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {p.taggedAdmins.map((admin) => (
                          <Badge key={admin} variant="outline" className="text-[11px] gap-1 rounded-full border-primary/30 text-primary bg-primary/5">
                            <MapPin className="w-2.5 h-2.5" /> @{admin}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {p.poll && (
                      <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-muted">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" /> Hasil Polling
                        </p>
                        <DiskusiPollView postId={p.id} poll={p.poll} compact />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                      <button
                        onClick={() => toggleReplies(p.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium hover:text-primary transition-colors"
                        disabled={loadingReplies[p.id]}
                      >
                        {loadingReplies[p.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : expandedReplies[p.id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                        {p.replyCount} Balasan
                      </button>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 rounded-xl text-muted-foreground font-semibold gap-1.5 hover:bg-foreground/5"
                          onClick={() => setPreviewPost(p)}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Detail & Balasan
                        </Button>

                        {!p.adminRating && ratingPost !== p.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 rounded-xl text-primary font-bold gap-2 hover:bg-primary/10"
                            onClick={() => setRatingPost(p.id)}
                          >
                            <Send className="w-4 h-4" />
                            Beri Tanggapan
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Balasan */}
                  {expandedReplies[p.id] && (
                    <div className="px-4 sm:px-6 pb-4 space-y-2 border-t border-dashed pt-4">
                      {expandedReplies[p.id].length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Belum ada balasan</p>
                      ) : (
                        expandedReplies[p.id].map((r) => (
                          <div key={r.id} className={cn(
                            "rounded-xl p-3 text-sm space-y-1",
                            r.isAdmin ? "bg-primary/5 border border-primary/20" : "bg-muted/40"
                          )}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-xs">{r.isAdmin ? (r.adminName || "Admin Desa") : r.authorAlias}</span>
                              {r.isAdmin && <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground rounded-full border-none">✓ Admin</Badge>}
                              {r.parentReplyId ? (
                                (() => {
                                  const parent = expandedReplies[p.id]?.find(x => x.id === r.parentReplyId);
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
                              <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.createdAt).toLocaleString("id-ID")}</span>
                            </div>
                            {r.content && <p className="text-xs leading-relaxed">{r.content}</p>}
                          </div>
                        ))
                      )}
                      <button
                        onClick={() => toggleReplies(p.id)}
                        className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 pt-1"
                      >
                        <ChevronUp className="w-3 h-3" /> Sembunyikan balasan
                      </button>
                    </div>
                  )}

                  {/* Tanggapan Section */}
                  {(p.adminRating || ratingPost === p.id) && (
                    <div className={cn(
                      "p-4 sm:p-6 border-t border-dashed transition-colors",
                      p.adminRating ? "bg-primary/5" : "bg-muted/10"
                    )}>
                      {p.adminRating && editingPost !== p.id ? (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-primary">Tanggapan Resmi Desa</p>
                            <p className="text-sm text-foreground leading-relaxed">&ldquo;{p.adminRating.note}&rdquo;</p>
                            <p className="text-[10px] text-muted-foreground">— {p.adminRating.ratedBy}</p>
                          </div>
                          {villageId && (
                            <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 shrink-0 self-start" onClick={() => { setEditingPost(p.id); setNote(p.adminRating!.note || ""); }}>
                              Edit
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold">{editingPost === p.id ? "Edit Tanggapan Resmi Desa" : "Tulis Tanggapan Resmi Desa"}</p>
                            <button onClick={() => { setRatingPost(null); setEditingPost(null); setNote(""); }}>
                              <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                          <Textarea
                            placeholder="Tulis tanggapan atau solusi dari pihak desa untuk warga..."
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="text-sm rounded-2xl bg-background border-none shadow-inner"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" className="rounded-xl h-10 px-4 font-semibold" onClick={() => { setRatingPost(null); setEditingPost(null); setNote(""); }}>
                              Batal
                            </Button>
                            <Button className="rounded-xl h-10 px-6 font-bold gap-2" onClick={() => submitTanggapan(p.id, editingPost === p.id)} disabled={saving}>
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              {editingPost === p.id ? "Perbarui" : "Simpan"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!villageId && posts.length > 0 && (
          <div className="p-6 rounded-[32px] bg-amber-50/50 border-2 border-dashed border-amber-200 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-amber-900">Mode View-Only</h4>
            <p className="text-xs text-amber-700/80 mt-1">
              Buka dashboard dari menu desa untuk memberikan tanggapan resmi sebagai admin desa.
            </p>
          </div>
        )}

        {/* Dialog Preview Detail */}
        {previewPost && (
          <Dialog open={!!previewPost} onOpenChange={(open) => { if (!open) setPreviewPost(null); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-background">
              <DialogHeader className="p-6 pb-4 border-b border-foreground/10 flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="font-display text-xl">Detail & Tanggapan Diskusi</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Preview aspirasi warga dan kirim tanggapan desa secara langsung.
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Post Header */}
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {previewPost.authorAlias.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{previewPost.authorAlias}</span>
                      {previewPost.villageName && (
                        <Badge variant="outline" className="text-[10px] h-5 rounded-full">
                          {previewPost.villageName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Post #{previewPost.id.slice(0, 8)} · {new Date(previewPost.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewPost.content}</p>

                {/* Hashtags & Tags */}
                {(previewPost.hashtags.length > 0 || previewPost.taggedAdmins?.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {previewPost.hashtags.map((h) => (
                      <span key={h} className="text-[11px] font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                        #{h}
                      </span>
                    ))}
                    {previewPost.taggedAdmins?.map((admin) => (
                      <Badge key={admin} variant="outline" className="text-[11px] gap-1 rounded-full border-primary/30 text-primary bg-primary/5">
                        <MapPin className="w-2.5 h-2.5" /> @{admin}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Poll View */}
                {previewPost.poll && (
                  <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-muted">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Hasil Polling
                    </p>
                    <DiskusiPollView postId={previewPost.id} poll={previewPost.poll} compact />
                  </div>
                )}

                {/* Tanggapan Resmi Section */}
                <div className={cn(
                  "p-5 rounded-2xl border border-dashed transition-colors",
                  previewPost.adminRating ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-foreground/10"
                )}>
                  {previewPost.adminRating && !dialogEditing ? (
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">Tanggapan Resmi Desa</p>
                        <p className="text-sm text-foreground leading-relaxed">&ldquo;{previewPost.adminRating.note}&rdquo;</p>
                        <p className="text-[10px] text-muted-foreground">— {previewPost.adminRating.ratedBy}</p>
                      </div>
                      {villageId && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl text-xs h-8 shrink-0 self-start" 
                          onClick={() => { setDialogEditing(true); setDialogNote(previewPost.adminRating!.note || ""); }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          {dialogEditing ? "Edit Tanggapan Resmi Desa" : "Beri Tanggapan Resmi Desa"}
                        </p>
                        {dialogEditing && (
                          <button onClick={() => { setDialogEditing(false); setDialogNote(""); }}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                      {villageId ? (
                        <>
                          <Textarea
                            placeholder="Tulis tanggapan atau solusi dari pihak desa untuk warga..."
                            rows={3}
                            value={dialogNote}
                            onChange={(e) => setDialogNote(e.target.value)}
                            className="text-sm rounded-2xl bg-background border border-foreground/10 p-3"
                          />
                          <div className="flex gap-2 justify-end">
                            {dialogEditing && (
                              <Button 
                                variant="ghost" 
                                className="rounded-xl h-9 px-4 text-xs font-semibold" 
                                onClick={() => { setDialogEditing(false); setDialogNote(""); }}
                              >
                                Batal
                              </Button>
                            )}
                            <Button 
                              className="rounded-xl h-9 px-5 text-xs font-bold gap-2" 
                              onClick={() => submitDialogTanggapan(dialogEditing)} 
                              disabled={dialogSaving}
                            >
                              {dialogSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {dialogEditing ? "Perbarui" : "Simpan Tanggapan"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-amber-600 font-medium italic">
                          Buka dashboard sebagai admin desa untuk memberikan tanggapan resmi.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Replies Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    Balasan Warga ({previewPost.replyCount})
                  </h3>
                  
                  {loadingPreviewReplies ? (
                    <div className="flex justify-center py-6">
                      <Spinner size="sm" text="Memuat balasan..." />
                    </div>
                  ) : previewReplies.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 bg-muted/10 rounded-xl border border-dashed">
                      Belum ada balasan dari warga.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {previewReplies.map((r) => (
                        <div key={r.id} className={cn(
                          "rounded-xl p-3 text-sm space-y-1",
                          r.isAdmin ? "bg-primary/5 border border-primary/20" : "bg-muted/40"
                        )}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs">{r.isAdmin ? (r.adminName || "Admin Desa") : r.authorAlias}</span>
                            {r.isAdmin && <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground rounded-full border-none">✓ Admin</Badge>}
                            {r.parentReplyId ? (
                              (() => {
                                const parent = previewReplies.find(x => x.id === r.parentReplyId);
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
                            <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.createdAt).toLocaleString("id-ID")}</span>
                          </div>
                          {r.content && <p className="text-xs leading-relaxed">{r.content}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-foreground/10 bg-muted/5 flex justify-end gap-2 shrink-0">
                <Button 
                  variant="ghost" 
                  className="rounded-xl h-10 px-4 text-xs font-semibold" 
                  onClick={() => setPreviewPost(null)}
                >
                  Tutup
                </Button>
                <Button 
                  variant="secondary"
                  className="rounded-xl h-10 px-4 text-xs font-semibold gap-1.5" 
                  onClick={() => window.open(`/diskusi/${previewPost.id}`, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Halaman Warga
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminDiskusiPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Memuat panel admin...</div>}>
      <AdminDiskusiContent />
    </Suspense>
  );
}
