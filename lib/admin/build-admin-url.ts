import { getAppBaseUrl } from "@/lib/url";

export function buildAdminPanelUrl(params: {
  uid: string;
  villageName: string;
  latitude: string;
  longitude: string;
  adminToken: string;
}) {
  const base = getAppBaseUrl().replace(/\/$/, "");
  const qs = new URLSearchParams({
    id: params.uid,
    desa: params.villageName,
    lat: params.latitude,
    lng: params.longitude,
    token: params.adminToken,
  });
  return `${base}/admin?${qs.toString()}`;
}

export function buildAdminPanelPath(params: {
  uid: string;
  villageName: string;
  latitude: string;
  longitude: string;
  adminToken: string;
}) {
  const qs = new URLSearchParams({
    id: params.uid,
    desa: params.villageName,
    lat: params.latitude,
    lng: params.longitude,
    token: params.adminToken,
  });
  return `/admin?${qs.toString()}`;
}

export function appendAdminQuery(path: string, query: string) {
  if (!query) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${query}`;
}
