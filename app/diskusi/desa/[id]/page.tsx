"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Loader2, MessageSquare } from "lucide-react";
import { WargaShell } from "@/components/warga/warga-shell";
import { DiskusiPostCard } from "@/components/warga/diskusi-post-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// We'll lazy load Leaflet on client side inside VillageMap
import { VillageMap } from "@/components/dashboard-admin/village-map";

export default function PublicVillageProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [profile, setProfile] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState<"resmi" | "tag">("resmi");

  const officialPosts = useMemo(() => {
    return posts.filter((p) => p.authorRole === "admin");
  }, [posts]);

  const taggedPosts = useMemo(() => {
    return posts.filter((p) => p.authorRole !== "admin");
  }, [posts]);

  const activePosts = activeTab === "resmi" ? officialPosts : taggedPosts;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Fetch safe public profile
    fetch(`/api/villages/profile?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
        }
      })
      .catch((err) => console.error("Gagal memuat profil desa:", err))
      .finally(() => setLoading(false));

    // Fetch village posts
    setLoadingPosts(true);
    fetch(`/api/diskusi/posts?villageId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
      })
      .catch((err) => console.error("Gagal memuat postingan desa:", err))
      .finally(() => setLoadingPosts(false));
  }, [id]);

  const mapCenter = useMemo(() => {
    const lat = parseFloat(profile?.latitude || "");
    const lng = parseFloat(profile?.longitude || "");
    if (isNaN(lat) || isNaN(lng)) return { lat: -6.2, lng: 106.8 };
    return { lat, lng };
  }, [profile]);

  if (loading) {
    return (
      <WargaShell wide>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </WargaShell>
    );
  }

  if (!profile) {
    return (
      <WargaShell wide>
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">Profil desa tidak ditemukan atau belum terdaftar.</p>
          <Button onClick={() => router.push("/diskusi")}>Kembali ke diskusi</Button>
        </div>
      </WargaShell>
    );
  }

  const initials = profile.villageName
    ? profile.villageName.charAt(0).toUpperCase()
    : "D";

  return (
    <WargaShell wide>
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/diskusi")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Profil Instansi Desa
            </p>
            <h1 className="text-xl font-display font-bold tracking-tight">Desa {profile.villageName}</h1>
          </div>
        </div>

        {/* Banner + Profile Pic Overlap Section */}
        <div className="relative">
          {/* Cover Banner */}
          <div className="relative h-44 sm:h-56 rounded-3xl overflow-hidden shadow-md bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/5">
            {profile.villageThumbnail ? (
              <img
                src={profile.villageThumbnail}
                alt="Banner Desa"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 font-display text-3xl">
                Lapor.ah Desa
              </div>
            )}
          </div>

          {/* Profile Photo Overlapping */}
          <div className="absolute -bottom-14 left-6 sm:left-10 right-6 sm:right-10 flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-background bg-popover shadow-lg overflow-hidden shrink-0">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.villageName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary text-primary-foreground flex items-center justify-center font-display text-2xl font-black">
                    {initials}
                  </div>
                )}
              </div>

              {/* Title / Names (desktop) */}
              <div className="hidden sm:block mb-1 min-w-0">
                <h2 className="text-2xl font-display font-black tracking-tight text-foreground truncate">
                  Desa {profile.villageName}
                </h2>
                <p className="text-xs font-mono text-muted-foreground">
                  Kepala Desa: {profile.adminName}
                </p>
              </div>
            </div>

            {/* Hubungi / Pesan button (desktop) */}
            <div className="hidden sm:block mb-1 shrink-0">
              <Button 
                onClick={() => router.push(`/pesan?villageId=${profile.id}`)}
                className="rounded-full gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                <MessageSquare className="w-4 h-4" />
                Hubungi Desa
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Names & Description */}
        <div className="pt-6 sm:pt-0 space-y-6">
          <div className="sm:hidden min-w-0 px-2 flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-display font-black tracking-tight text-foreground">
                Desa {profile.villageName}
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                Kepala Desa: {profile.adminName}
              </p>
            </div>
            
            <Button 
              onClick={() => router.push(`/pesan?villageId=${profile.id}`)}
              className="w-full rounded-full gap-2 shadow-md"
              size="sm"
            >
              <MessageSquare className="w-4 h-4" />
              Hubungi Desa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Description & Map */}
            <div className="md:col-span-6 space-y-6">
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Tentang Desa
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-wrap">
                    {profile.catatan || `Selamat datang di profil resmi instansi Desa ${profile.villageName}. Silakan ajukan pertanyaan atau aduan secara teratur melalui panel Lapor.ah.`}
                  </p>
                </CardContent>
              </Card>

              {/* Village Map */}
              <Card className="border-2 border-primary/5 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Koordinat Balai Desa
                    </h3>
                    <Badge variant="secondary" className="font-mono text-[9px] gap-1 px-2 py-0.5 rounded-full">
                      <MapPin className="w-2.5 h-2.5 text-primary" />
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
                          detail: "Balai / Kantor Desa Resmi",
                          type: "village",
                        },
                      ]}
                      height={180}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Village Posts Feed */}
            <div className="md:col-span-6 space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Diskusi & Postingan Desa</span>
              </div>

              {/* Premium Tabs */}
              <div className="flex p-1 bg-muted/40 rounded-xl gap-1 border border-primary/5">
                <button
                  onClick={() => setActiveTab("resmi")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "resmi"
                      ? "bg-background text-primary shadow-sm border border-primary/5"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  Resmi ({officialPosts.length})
                </button>
                <button
                  onClick={() => setActiveTab("tag")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === "tag"
                      ? "bg-background text-primary shadow-sm border border-primary/5"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  Tag Warga ({taggedPosts.length})
                </button>
              </div>

              {loadingPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                </div>
              ) : activePosts.length === 0 ? (
                <div className="text-center py-16 bg-muted/5 rounded-2xl border-2 border-dashed text-[11px] text-muted-foreground">
                  {activeTab === "resmi"
                    ? "Belum ada postingan resmi dari instansi Desa ini."
                    : "Belum ada postingan warga yang menandai (tag) Desa ini."}
                </div>
              ) : (
                <div className="space-y-4">
                  {activePosts.map((post) => (
                    <DiskusiPostCard
                      key={post.id}
                      post={post}
                      variant="feed"
                      onTagClick={(tag) => router.push(`/diskusi?tag=${tag}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WargaShell>
  );
}
