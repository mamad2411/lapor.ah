"use client";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  detail?: string;
  type?: "village" | "issue";
}

interface VillageMapInnerProps {
  center: { lat: number; lng: number };
  points: MapPoint[];
  height?: number;
}

export default function VillageMapInner({ center, points, height = 280 }: VillageMapInnerProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-foreground/10" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) =>
          p.type === "village" ? (
            <Marker key={`${p.lat}-${p.lng}-${i}`} position={[p.lat, p.lng]} icon={defaultIcon}>
              <Popup>
                <strong>{p.label}</strong>
                {p.detail && <p className="text-xs mt-1">{p.detail}</p>}
              </Popup>
            </Marker>
          ) : (
            <CircleMarker
              key={`${p.lat}-${p.lng}-${i}`}
              center={[p.lat, p.lng]}
              radius={8}
              pathOptions={{ color: "#ef4444", fillColor: "#f87171", fillOpacity: 0.8 }}
            >
              <Popup>
                <strong>{p.label}</strong>
                {p.detail && <p className="text-xs mt-1 max-w-[200px]">{p.detail}</p>}
              </Popup>
            </CircleMarker>
          )
        )}
      </MapContainer>
    </div>
  );
}
