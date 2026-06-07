"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Loader2, MapPin, Navigation, Search, Crosshair } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import "leaflet/dist/leaflet.css";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number];
  setPosition: (p: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  const [prevCenter, setPrevCenter] = useState<[number, number]>(center);

  useEffect(() => {
    // Hanya terbang jika koordinat berubah secara signifikan (> 0.0001)
    // untuk mencegah getaran (jitter) saat render ulang
    const diffLat = Math.abs(prevCenter[0] - center[0]);
    const diffLng = Math.abs(prevCenter[1] - center[1]);
    
    if (diffLat > 0.0001 || diffLng > 0.0001) {
      map.flyTo(center, zoom ?? map.getZoom(), { duration: 1 });
      setPrevCenter(center);
    }
  }, [center, zoom, map, prevCenter]);
  return null;
}

type SearchResult = { display_name: string; lat: string; lon: string };

type Props = {
  mapPosition: [number, number];
  setMapPosition: (p: [number, number]) => void;
  villageName?: string;
};

export default function RegisterMap({ mapPosition, setMapPosition, villageName }: Props) {
  const [searchQuery, setSearchQuery] = useState(villageName || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latInput, setLatInput] = useState(mapPosition[0].toFixed(6));
  const [lngInput, setLngInput] = useState(mapPosition[1].toFixed(6));

  useEffect(() => {
    setLatInput(mapPosition[0].toFixed(6));
    setLngInput(mapPosition[1].toFixed(6));
  }, [mapPosition]);

  const searchLocation = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(`${searchQuery}, Indonesia`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&countrycodes=id`,
        { headers: { "Accept-Language": "id" } }
      );
      const data: SearchResult[] = await res.json();
      setSearchResults(data);
      if (data.length > 0) {
        const first = data[0];
        setMapPosition([parseFloat(first.lat), parseFloat(first.lon)]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, setMapPosition]);

  useEffect(() => {
    if (villageName && !searchQuery) setSearchQuery(villageName);
  }, [villageName, searchQuery]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const applyManualCoords = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setMapPosition([lat, lng]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari desa, kecamatan, kabupaten..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchLocation()}
            className="pl-9 text-sm"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={searchLocation} disabled={searching}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cari"}
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={useMyLocation} disabled={locating} title="Lokasi saya">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" /> }
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="max-h-24 overflow-y-auto rounded-md border bg-background text-xs">
          {searchResults.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-0 truncate"
              onClick={() => {
                setMapPosition([parseFloat(r.lat), parseFloat(r.lon)]);
                setSearchResults([]);
              }}
            >
              <MapPin className="w-3 h-3 inline mr-1" />
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="h-[260px] w-full rounded-lg border overflow-hidden relative z-0">
        <MapContainer center={mapPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={mapPosition} setPosition={setMapPosition} />
          <MapController center={mapPosition} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <Crosshair className="w-3 h-3" /> Latitude
          </Label>
          <Input
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={applyManualCoords}
            className="font-mono text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <Crosshair className="w-3 h-3" /> Longitude
          </Label>
          <Input
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={applyManualCoords}
            className="font-mono text-xs h-8"
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Klik peta, cari nama desa, gunakan GPS, atau masukkan koordinat manual untuk menandai pusat kantor desa.
      </p>
    </div>
  );
}
