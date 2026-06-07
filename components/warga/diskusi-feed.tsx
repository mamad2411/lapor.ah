"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  Search,
  Plus,
  X,
  MessageSquare,
  Zap,
  Trophy,
  Flame,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  LayoutGrid,
  MapPin,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { DiskusiPost, TrendingHashtag, VillageOption } from "@/lib/warga/types";
import { DiskusiPostCard } from "./diskusi-post-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TAGLINE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  hot_today: { label: "Hot Hari Ini", icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
  popular_week: { label: "Populer Minggu Ini", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  hot_month: { label: "Hot Bulan Ini", icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
  default: { label: "Trending", icon: TrendingUp, color: "text-primary", bg: "bg-primary/5" },
};

export function DiskusiFeed({ initialTag }: { initialTag?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<DiskusiPost[]>([]);
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState(initialTag || searchParams.get("tag") || "");
  const [filterVillage, setFilterVillage] = useState("");
  const [sort, setSort] = useState("foryou");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showRules, setShowRules] = useState(false);

  // Search Suggestion states
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<{
    hashtags: string[];
    recentPosts: { id: string; content: string; author: string }[];
    villages: string[];
  }>({ hashtags: [], recentPosts: [], villages: [] });

  useEffect(() => {
    const hasSeenRules = localStorage.getItem("diskusi_rules_seen");
    if (!hasSeenRules) {
      setShowRules(true);
    }
  }, []);

  const closeRules = () => {
    localStorage.setItem("diskusi_rules_seen", "true");
    setShowRules(false);
  };
// ... rest of loadPosts and useEffects

  const loadPosts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterTag) params.set("hashtag", filterTag);
    if (filterVillage) params.set("villageId", filterVillage);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    const q = params.toString() ? `?${params}` : "";
    fetch(`/api/diskusi/posts${q}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .finally(() => setLoading(false));
  }, [filterTag, filterVillage, search, sort]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    fetch("/api/diskusi/trending").then((r) => r.json()).then((d) => setTrending(d.trending || []));
    fetch("/api/villages/list").then((r) => r.json()).then((d) => setVillages(d.villages || []));
    
    // Fetch search dropdown suggestions from database
    fetch("/api/diskusi/search/dropdown")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSearchSuggestions({
            hashtags: data.hashtags || [],
            recentPosts: data.recentPosts || [],
            villages: data.villages || [],
          });
        }
      })
      .catch((err) => console.error("Gagal memuat saran pencarian:", err));
  }, []);

  function applyTagFilter(tag: string) {
    setFilterTag(tag);
    router.push(`/diskusi?tag=${tag}`);
  }

  const hasActiveFilters = filterTag || filterVillage || search;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar Kiri - Desktop */}
      <aside className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="sticky top-24 space-y-6">
          <Card className="border-none shadow-sm bg-primary/5 rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <h2 className="font-display text-2xl mb-2 text-primary">Diskusi Warga</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                Ruang terbuka untuk berbagi informasi, aspirasi, dan solusi demi kemajuan desa kita bersama.
              </p>
              <Button className="w-full rounded-2xl h-12 gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" asChild>
                <Link href="/diskusi/buat">
                  <Plus className="w-5 h-5" />
                  Buat Diskusi
                </Link>
              </Button>
            </CardContent>
          </Card>

          {trending.length > 0 && (
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Hashtag Populer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                <Button
                  variant={!filterTag ? "secondary" : "ghost"}
                  className="w-full justify-start h-10 rounded-xl text-xs font-semibold mb-2"
                  onClick={() => applyTagFilter("")}
                >
                  <LayoutGrid className="w-3 h-3 mr-2 opacity-50" />
                  Semua Diskusi
                </Button>
                {trending.slice(0, 10).map((t, i) => {
                  const config = TAGLINE_CONFIG[t.tagline] || TAGLINE_CONFIG.default;
                  const Icon = config.icon;
                  return (
                    <div key={t.tag} className="group relative">
                      <Button
                        variant={filterTag === t.tag ? "secondary" : "ghost"}
                        className="w-full justify-start h-auto py-3 px-3 rounded-xl text-xs font-medium transition-all group-hover:bg-muted"
                        onClick={() => applyTagFilter(t.tag)}
                      >
                        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-muted mr-3 text-[10px] font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1 text-left">
                          <p className="font-bold truncate">#{t.tag}</p>
                          <div className={cn("flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-md w-fit", config.bg)}>
                            <Icon className={cn("w-2.5 h-2.5", config.color)} />
                            <span className={cn("text-[8px] font-bold uppercase tracking-tighter", config.color)}>
                              {config.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold opacity-50">{t.count}</span>
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </aside>

      {/* Main Feed */}
      <main className="lg:col-span-6 space-y-6">
        {/* Mobile CTA */}
        <div className="lg:hidden">
          <Button className="w-full rounded-2xl h-14 text-lg font-display gap-2 shadow-xl shadow-primary/20 bg-primary text-primary-foreground" asChild>
            <Link href="/diskusi/buat">
              <Plus className="w-6 h-6" />
              Buat Postingan Baru
            </Link>
          </Button>
        </div>

        {/* Toolbar / Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-3 rounded-2xl border shadow-sm">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              placeholder="Cari topik diskusi..."
              className="pl-9 h-11 bg-muted/50 border-none rounded-xl text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setSearchFocused(false);
                }
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                // Delay blur slightly to allow click events to proceed
                setTimeout(() => setSearchFocused(false), 200);
              }}
            />

            {searchFocused && (
              <div 
                className="absolute z-50 left-0 top-full mt-2 w-[320px] sm:w-[360px] rounded-2xl border border-primary/10 bg-popover/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2"
                onMouseDown={(e) => {
                  // Prevent input blur before click handler runs
                  e.preventDefault();
                }}
              >
                <div className="p-2.5 max-h-[380px] overflow-y-auto space-y-3 scrollbar-thin">
                  {/* Hashtags Section */}
                  {searchSuggestions.hashtags.filter(h => h.toLowerCase().includes(searchInput.toLowerCase())).length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary/70">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        Hashtag Populer
                      </div>
                      <div className="grid grid-cols-2 gap-1 px-1">
                        {searchSuggestions.hashtags
                          .filter(h => h.toLowerCase().includes(searchInput.toLowerCase()))
                          .slice(0, 6)
                          .map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => {
                                applyTagFilter(h);
                                setSearchFocused(false);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-primary/10 hover:text-primary rounded-xl transition-all border border-transparent hover:border-primary/10 text-muted-foreground truncate"
                            >
                              <Hash className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                              <span className="truncate">#{h}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Villages Section */}
                  {villages.filter(v => 
                    v.villageName.toLowerCase().includes(searchInput.toLowerCase()) || 
                    v.adminName.toLowerCase().includes(searchInput.toLowerCase())
                  ).length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary/70">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Desa Terkait
                      </div>
                      <div className="space-y-0.5">
                        {villages
                          .filter(v => 
                            v.villageName.toLowerCase().includes(searchInput.toLowerCase()) || 
                            v.adminName.toLowerCase().includes(searchInput.toLowerCase())
                          )
                          .slice(0, 4)
                          .map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                router.push(`/diskusi/desa/${v.id}`);
                                setSearchFocused(false);
                              }}
                              className="flex items-center gap-3 w-full px-2.5 py-2 text-left hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
                            >
                              {v.profileImage ? (
                                <img
                                  src={v.profileImage}
                                  alt={v.villageName}
                                  className="w-7 h-7 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                  {v.villageName.charAt(0)}
                                </div>
                              )}
                              <div className="truncate">
                                <p className="text-xs font-semibold leading-tight">Desa {v.villageName}</p>
                                <p className="text-[9px] text-muted-foreground/85 leading-none mt-0.5">{v.adminName}</p>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Discussions Section */}
                  {searchSuggestions.recentPosts.filter(p => p.content.toLowerCase().includes(searchInput.toLowerCase())).length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary/70">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        Diskusi Terkini
                      </div>
                      <div className="space-y-0.5">
                        {searchSuggestions.recentPosts
                          .filter(p => p.content.toLowerCase().includes(searchInput.toLowerCase()))
                          .slice(0, 4)
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                router.push(`/diskusi/${p.id}`);
                                setSearchFocused(false);
                              }}
                              className="flex items-start gap-2.5 w-full px-2.5 py-2 text-left hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                            >
                              <MessageSquare className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
                              <div className="truncate">
                                <p className="text-xs text-muted-foreground leading-normal line-clamp-2">{p.content}</p>
                                <span className="text-[9px] text-primary/60 font-medium">oleh @{p.author || "Warga"}</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {searchSuggestions.hashtags.filter(h => h.toLowerCase().includes(searchInput.toLowerCase())).length === 0 &&
                   villages.filter(v => v.villageName.toLowerCase().includes(searchInput.toLowerCase()) || v.adminName.toLowerCase().includes(searchInput.toLowerCase())).length === 0 &&
                   searchSuggestions.recentPosts.filter(p => p.content.toLowerCase().includes(searchInput.toLowerCase())).length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground font-medium">
                      Tidak ada hasil saran untuk &quot;{searchInput}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-none text-xs font-semibold">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="foryou">Untuk Anda (Algoritma)</SelectItem>
                <SelectItem value="new">Terbaru</SelectItem>
                <SelectItem value="replies">Paling Ramai</SelectItem>
                <SelectItem value="poll">Polling Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center bg-primary/5 p-3 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Filter Aktif:</span>
            {filterTag && (
              <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1 rounded-full">
                #{filterTag}
                <button onClick={() => applyTagFilter("")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filterVillage && (
              <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1 rounded-full">
                {villages.find(v => v.id === filterVillage)?.villageName}
                <button onClick={() => setFilterVillage("")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {search && (
              <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1 rounded-full">
                &quot;{search}&quot;
                <button onClick={() => { setSearch(""); setSearchInput(""); }}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold ml-auto hover:bg-primary/10 text-primary" onClick={() => {
              setFilterTag("");
              setFilterVillage("");
              setSearch("");
              setSearchInput("");
              router.push("/diskusi");
            }}>
              RESET SEMUA
            </Button>
          </div>
        )}

        {/* Feed List */}
        <div className="grid gap-6 grid-cols-1">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-muted/40 animate-pulse border-2 border-dashed" />
            ))
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <DiskusiPostCard
                key={post.id}
                post={post}
                onTagClick={applyTagFilter}
                variant="feed"
              />
            ))
          ) : (
            <div className="text-center py-24 bg-muted/10 rounded-[40px] border-2 border-dashed border-muted">
              <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-display mb-2">Belum ada diskusi</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8">
                Jadilah yang pertama memulai percakapan atau gunakan filter lain.
              </p>
              <Button className="rounded-full px-10 h-12 text-base font-semibold" asChild>
                <Link href="/diskusi/buat">Mulai Diskusi Baru</Link>
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Kanan - Desktop (Statistik/Info) */}
      <aside className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="sticky top-24 space-y-6">
          <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8">
              <Zap className="w-8 h-8 mb-4 opacity-50" />
              <div className="space-y-6">
                <div>
                  <p className="text-4xl font-display leading-none mb-1">{posts.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Total Postingan</p>
                </div>
                <div className="h-px bg-white/20" />
                <div>
                  <p className="text-4xl font-display leading-none mb-1">{trending.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Topik Trending</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </aside>

      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="sm:max-w-[500px] rounded-[40px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Aturan Komunitas Desa Digital</DialogTitle>
            <DialogDescription>
              Selamat datang di ruang diskusi warga. Mari ciptakan lingkungan yang positif dan solutif.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <ShieldAlert className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-3xl font-display leading-tight mb-2">
              Aturan Komunitas <br /> Desa Digital
            </p>
            <p className="text-primary-foreground/70 text-sm">
              Selamat datang di ruang diskusi warga. Mari ciptakan lingkungan yang positif dan solutif.
            </p>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Gunakan Bahasa Sopan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sampaikan aspirasi tanpa menghina atau menggunakan kata kasar.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Fokus pada Solusi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Diskusikan masalah desa untuk mencari jalan keluar bersama.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Anti Hoax & Provokasi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pastikan informasi yang dibagikan akurat dan tidak memecah belah.</p>
                </div>
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20" onClick={closeRules}>
              Saya Mengerti & Setuju
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
