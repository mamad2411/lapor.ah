"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, AlertCircle } from "lucide-react";
import { AdminLayout } from "./admin-layout";
import { SectionHeading } from "./section-heading";
import { VillageMap, type MapPoint } from "./village-map";
import { getAuthClient } from "@/lib/firebase/client";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

type WilayahRow = {
  key: string;
  label: string;
  total: number;
  belum: number;
  proses: number;
  selesai: number;
  laporan: {
    id: string;
    ticketId: string;
    kategori: string;
    deskripsi: string;
    status: string;
    tingkatUrgensi: string;
    issueLat: string;
    issueLng: string;
    issueAddress: string;
    createdAt: string;
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Belum",
  dibaca: "Dibaca",
  diproses: "Proses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export function WilayahPageLive() {
  const searchParams = useSearchParams();
  const villageId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [wilayah, setWilayah] = useState<WilayahRow[]>([]);
  const [village, setVillage] = useState({ name: "", lat: "", lng: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const idToken = await getAuthClient().currentUser?.getIdToken();
        if (!idToken) throw new Error("Sesi habis");
        const q = villageId ? `?villageId=${villageId}` : "";
        const res = await fetch(`/api/admin/statistik/wilayah${q}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setWilayah(data.wilayah || []);
        setVillage(data.village || { name: "", lat: "", lng: "" });
        if (data.wilayah?.[0]) setSelected(data.wilayah[0].key);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [villageId]);

  const selectedRow = wilayah.find((w) => w.key === selected) || wilayah[0];

  const mapPoints = useMemo(() => {
    const points: MapPoint[] = [];
    const vLat = parseFloat(village.lat);
    const vLng = parseFloat(village.lng);
    if (!isNaN(vLat) && !isNaN(vLng)) {
      points.push({
        lat: vLat,
        lng: vLng,
        label: `Kantor Desa ${village.name}`,
        detail: "Lokasi terdaftar saat pendaftaran",
        type: "village",
      });
    }
    for (const w of wilayah) {
      for (const l of w.laporan) {
        const lat = parseFloat(l.issueLat);
        const lng = parseFloat(l.issueLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          points.push({
            lat,
            lng,
            label: l.ticketId,
            detail: `${l.kategori} — ${l.deskripsi}`,
            type: "issue",
          });
        }
      }
    }
    return points;
  }, [village, wilayah]);

  const center = useMemo(() => {
    const vLat = parseFloat(village.lat);
    const vLng = parseFloat(village.lng);
    if (!isNaN(vLat) && !isNaN(vLng)) return { lat: vLat, lng: vLng };
    if (mapPoints[0]) return { lat: mapPoints[0].lat, lng: mapPoints[0].lng };
    return { lat: -6.2, lng: 106.8 };
  }, [village, mapPoints]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeading
          label="Wilayah"
          title="Laporan per wilayah desa"
          description="Distribusi pengaduan berdasarkan RT/RW di desa Anda — hanya laporan yang masuk ke desa terdaftar."
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" text="Memuat data wilayah desa..." />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : wilayah.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada laporan masuk untuk desa ini.</p>
          </div>
        ) : (
          <>
            <VillageMap center={center} points={mapPoints} height={320} />
            <p className="text-xs text-muted-foreground font-mono">
              Pin merah = lokasi kejadian laporan · Pin biru = kantor desa ({village.lat}, {village.lng})
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              {wilayah.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setSelected(w.key)}
                  className={`text-left border rounded-lg p-5 transition-colors ${
                    selected === w.key ? "border-foreground bg-foreground/[0.03]" : "border-foreground/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{w.label}</p>
                        <p className="text-xs font-mono text-muted-foreground">{w.total} laporan</p>
                      </div>
                    </div>
                    <span className="font-display text-2xl">{w.total}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="border rounded p-2"><p className="font-display text-lg text-red-600">{w.belum}</p>Belum</div>
                    <div className="border rounded p-2"><p className="font-display text-lg text-orange-600">{w.proses}</p>Proses</div>
                    <div className="border rounded p-2"><p className="font-display text-lg text-green-600">{w.selesai}</p>Selesai</div>
                  </div>
                </button>
              ))}
            </div>

            {selectedRow && selectedRow.laporan.length > 0 && (
              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-foreground/10">
                  <p className="text-xs font-mono text-muted-foreground">Preview laporan — {selectedRow.label}</p>
                </div>
                <div className="divide-y divide-foreground/10">
                  {selectedRow.laporan.map((l) => (
                    <div key={l.id} className="px-5 py-4 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{l.ticketId}</span>
                        <Badge variant="outline">{STATUS_LABEL[l.status] || l.status}</Badge>
                        <Badge variant="secondary">{l.tingkatUrgensi}</Badge>
                      </div>
                      <p className="text-sm font-medium">{l.kategori}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{l.deskripsi}</p>
                      {l.issueAddress && (
                        <p className="text-xs text-muted-foreground">📍 {l.issueAddress}</p>
                      )}
                      {(l.issueLat || l.issueLng) && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${l.issueLat},${l.issueLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Buka di Maps ({l.issueLat}, {l.issueLng})
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
