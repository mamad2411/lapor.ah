"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/dashboard-admin/admin-layout";
import { useAdmin } from "@/components/dashboard-admin/admin-context";
import { VillageMap } from "@/components/dashboard-admin/village-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiskusiPostCard } from "@/components/warga/diskusi-post-card";
import { StickerPicker } from "@/components/warga/sticker-picker";
import type { StickerItem } from "@/lib/warga/types";
import {
  Camera,
  MapPin,
  Loader2,
  ImagePlus,
  Send,
  Plus,
  Vote,
  X,
  PlusCircle,
  FileEdit,
  Music,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthClient } from "@/lib/firebase/client";

interface EditingMedia {
  type: "image" | "video";
  url: string;
  bgMusic?: string;
}

export default function AdminProfilePage() {
  const { profile, refreshProfile } = useAdmin();
  const [savingBio, setSavingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);

  // Uploading states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Post composer states
  const [postContent, setPostContent] = useState("");
  const [media, setMedia] = useState<EditingMedia[]>([]);
  const [selectedStickers, setSelectedStickers] = useState<StickerItem[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);

  // Feed states
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setBioText(profile.settings.catatan || "");
      loadPosts();
    }
  }, [profile]);

  const mapCenter = useMemo(() => {
    const lat = parseFloat(profile?.latitude || "");
    const lng = parseFloat(profile?.longitude || "");
    if (isNaN(lat) || isNaN(lng)) return { lat: -6.2, lng: 106.8 };
    return { lat, lng };
  }, [profile]);

  const loadPosts = () => {
    if (!profile) return;
    setLoadingPosts(true);
    fetch(`/api/diskusi/posts?villageId=${profile.uid}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch((err) => console.error("Gagal memuat feed profil:", err))
      .finally(() => setLoadingPosts(false));
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, field: "profileImage" | "villageThumbnail") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "profileImage") setUploadingAvatar(true);
    else setUploadingCover(true);

    try {
      // Upload to storage
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", "profile");
      const uploadRes = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Gagal unggah foto");

      // Patch profile
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ [field]: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan foto");

      await refreshProfile();
      toast.success(field === "profileImage" ? "Foto profil diperbarui" : "Sampul desa diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah");
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
    }
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      const idToken = await getAuthClient().currentUser?.getIdToken();
      if (!idToken) throw new Error("Sesi habis");

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ catatan: bioText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshProfile();
      setIsEditingBio(false);
      toast.success("Deskripsi desa berhasil diperbarui");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setSavingBio(false);
    }
  };

  const handlePostMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject non-image and non-video
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Format file tidak didukung! Hanya bisa mengunggah Gambar dan Video.");
      return;
    }

    const type = file.type.startsWith("video/") ? "video" : "image";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", "diskusi");

    try {
      toast.loading("Mengunggah media...", { id: "media-upload" });
      const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMedia((prev) => [...prev, { type, url: data.url }]);
      toast.success("Media berhasil diunggah", { id: "media-upload" });
    } catch (err: any) {
      toast.error("Gagal unggah media: " + err.message, { id: "media-upload" });
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() && media.length === 0 && selectedStickers.length === 0) {
      toast.error("Tulis sesuatu atau pilih stiker/media untuk mengirim");
      return;
    }
    setPosting(true);
    try {
      const hashtags = [...postContent.match(/#\w+/g)?.map((h) => h.slice(1)) || []];

      const body: Record<string, any> = {
        content: postContent,
        hashtags,
        taggedAdmins: [profile?.villageName], // Tag themselves automatically
        villageName: profile?.villageName,
        villageId: profile?.uid,
        media: media.map((m) => ({
          type: m.type,
          url: m.url,
          bgMusic: m.type === "image" ? m.bgMusic || undefined : undefined, // Enforce no backsound on videos
        })),
        stickers: selectedStickers.map((s) => ({ id: s.id, url: s.url })),
      };

      if (showPoll) {
        body.poll = {
          question: pollQuestion,
          options: pollOptions.map((o) => o.trim()).filter(Boolean),
          durationDays: 7,
        };
      }

      const res = await fetch("/api/diskusi/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Postingan berhasil dikirim!");
      setPostContent("");
      setMedia([]);
      setSelectedStickers([]);
      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      loadPosts();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim postingan");
    } finally {
      setPosting(false);
    }
  };

  if (!profile) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const initials = profile.villageName
    ? profile.villageName.charAt(0).toUpperCase()
    : "D";

  return (
    <AdminLayout>
      <div className="space-y-10 max-w-4xl mx-auto pb-12">
        {/* Banner + Profile Pic Overlap Section */}
        <div className="relative">
          {/* Cover Banner */}
          <div className="relative h-48 sm:h-64 rounded-3xl overflow-hidden shadow-lg group/cover bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/5">
            {profile.villageThumbnail ? (
              <img
                src={profile.villageThumbnail}
                alt="Banner Desa"
                className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-display text-4xl">
                Lapor.ah Desa
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleUploadPhoto(e, "villageThumbnail")}
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-foreground/10 text-foreground text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5 shadow-md hover:bg-background transition-all"
            >
              {uploadingCover ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              Ubah Sampul
            </button>
          </div>

          {/* Profile Photo Overlapping */}
          <div className="absolute -bottom-16 left-6 sm:left-10 flex items-end gap-4">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-popover shadow-xl overflow-hidden group/avatar shrink-0">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.villageName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-display text-3xl font-black">
                  {initials}
                </div>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleUploadPhoto(e, "profileImage")}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Ubah</span>
                  </>
                )}
              </button>
            </div>

            {/* Title / Names (desktop) */}
            <div className="hidden sm:block mb-3 min-w-0">
              <h1 className="text-3xl font-display font-black tracking-tight text-foreground truncate">
                Desa {profile.villageName}
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-0.5">
                @{profile.name.toLowerCase().replace(/\s+/g, "_")}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Names & Description Info Card */}
        <div className="pt-8 sm:pt-0 space-y-6">
          <div className="sm:hidden min-w-0 px-2">
            <h1 className="text-2xl font-display font-black tracking-tight text-foreground">
              Desa {profile.villageName}
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              @{profile.name.toLowerCase().replace(/\s+/g, "_")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Description & Map */}
            <div className="md:col-span-7 space-y-6">
              <Card className="border-2 border-primary/5 shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                      Deskripsi Desa
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingBio(!isEditingBio)}
                      className="text-primary hover:bg-primary/5 h-8 gap-1 rounded-full px-3 text-xs"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      {isEditingBio ? "Batal" : "Edit"}
                    </Button>
                  </div>

                  {isEditingBio ? (
                    <div className="space-y-3">
                      <Textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        placeholder="Deskripsikan informasi profil singkat desa Anda..."
                        rows={4}
                        className="resize-none border-foreground/10 text-sm"
                      />
                      <Button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        size="sm"
                        className="rounded-full px-5"
                      >
                        {savingBio && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        Simpan Bio
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-wrap">
                      {profile.settings.catatan || "Belum ada deskripsi desa. Klik edit untuk menambahkan."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Village Map */}
              <Card className="border-2 border-primary/5 shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                      Pusat Wilayah Desa
                    </h3>
                    <Badge variant="secondary" className="font-mono text-[10px] gap-1 px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3 text-primary" />
                      {parseFloat(profile.latitude).toFixed(4)}, {parseFloat(profile.longitude).toFixed(4)}
                    </Badge>
                  </div>
                  <div className="relative z-0 rounded-xl overflow-hidden border">
                    <VillageMap
                      center={mapCenter}
                      points={[
                        {
                          lat: mapCenter.lat,
                          lng: mapCenter.lng,
                          label: `Desa ${profile.villageName}`,
                          detail: "Pusat Kantor / Balai Desa",
                          type: "village",
                        },
                      ]}
                      height={200}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: IG-Style Post Composer & Feed */}
            <div className="md:col-span-5 space-y-6">
              {/* Instagram-Style Post Composer */}
              <Card className="border-2 border-primary/5 shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-dashed">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Buat Postingan Desa</span>
                  </div>

                  <Textarea
                    placeholder="Tulis deskripsi / pengumuman desa baru..."
                    className="min-h-[90px] text-sm border-none focus-visible:ring-0 p-0 resize-none placeholder:text-muted-foreground/40"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />

                  {/* Media Upload Previews */}
                  {media.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      {media.map((m, i) => (
                        <div key={i} className="flex flex-col gap-1 items-start">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden border group bg-black shrink-0">
                            {m.type === "video" ? (
                              <video src={m.url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={m.url} alt="" className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={() => setMedia(media.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          {m.type === "image" && (
                            <Input
                              placeholder="Musik Latar..."
                              value={m.bgMusic || ""}
                              onChange={(e) => {
                                const nextMedia = [...media];
                                nextMedia[i] = { ...nextMedia[i], bgMusic: e.target.value };
                                setMedia(nextMedia);
                              }}
                              className="w-16 h-5 text-[6px] px-1 bg-background border-primary/20 rounded-md focus-visible:ring-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stickers Previews */}
                  {selectedStickers.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                      {selectedStickers.map((sticker, idx) => (
                        <div key={idx} className="relative group/sticker inline-block">
                          <div className="w-12 h-12 p-1.5 bg-primary/5 rounded-xl border border-primary/10">
                            <img src={sticker.url} alt="Stiker" className="w-full h-full object-contain" />
                          </div>
                          <button
                            onClick={() => setSelectedStickers(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 p-0.5 bg-destructive text-white rounded-full opacity-0 group-hover/sticker:opacity-100 transition-opacity"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Poll View */}
                  {showPoll && (
                    <div className="p-3 bg-primary/5 rounded-xl border border-dashed space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary">Polling Desa</span>
                        <button onClick={() => setShowPoll(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </div>
                      <Input
                        placeholder="Pertanyaan polling..."
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="h-8 bg-background text-xs border-none"
                      />
                      <div className="space-y-1.5">
                        {pollOptions.map((opt, i) => (
                          <Input
                            key={i}
                            placeholder={`Opsi ${i + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const next = [...pollOptions];
                              next[i] = e.target.value;
                              setPollOptions(next);
                            }}
                            className="h-8 bg-background/50 text-xs border-none"
                          />
                        ))}
                      </div>
                      {pollOptions.length < 4 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPollOptions([...pollOptions, ""])}
                          className="h-7 text-[10px] text-primary"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Opsi
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Post Controls */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handlePostMediaUpload}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                        onClick={() => fileRef.current?.click()}
                        title="Unggah Foto/Video"
                      >
                        <ImagePlus className="w-4 h-4" />
                      </Button>
                      <StickerPicker
                        onSelect={(s) => setSelectedStickers((prev) => [...prev, s])}
                      />
                      <Button
                        variant={showPoll ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                        onClick={() => setShowPoll(!showPoll)}
                        title="Buat Polling"
                      >
                        <Vote className="w-4 h-4" />
                      </Button>
                    </div>

                    <Button
                      onClick={handlePost}
                      disabled={posting || (!postContent.trim() && media.length === 0 && selectedStickers.length === 0)}
                      size="sm"
                      className="rounded-full px-5 h-8 gap-1.5"
                    >
                      {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Posting
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Feed of Posts */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Postingan Anda ({posts.length})
                </h3>

                {loadingPosts ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed text-xs text-muted-foreground">
                    Belum ada postingan dari akun desa Anda.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <DiskusiPostCard
                        key={post.id}
                        post={post}
                        variant="feed"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
