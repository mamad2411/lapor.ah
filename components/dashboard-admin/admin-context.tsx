"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";
import type { AdminProfile } from "@/lib/admin/map-profile";
import { appendAdminQuery } from "@/lib/admin/build-admin-url";

interface AdminContextValue {
  profile: AdminProfile | null;
  loading: boolean;
  error: string;
  queryString: string;
  adminHref: (path: string) => string;
  refreshProfile: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    const id = searchParams.get("id");
    const desa = searchParams.get("desa");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const token = searchParams.get("token");
    if (id) p.set("id", id);
    if (desa) p.set("desa", desa);
    if (lat) p.set("lat", lat);
    if (lng) p.set("lng", lng);
    if (token) p.set("token", token);
    return p.toString();
  }, [searchParams]);

  const loadProfile = useCallback(async () => {
    const auth = getAuthClient();
    const user = auth.currentUser;
    if (!user) return;

    const idToken = await user.getIdToken();
    const qs = queryString ? `?${queryString}` : "";
    const res = await fetch(`/api/admin/me${qs}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && (data.error?.toLowerCase().includes("banned") || data.error?.toLowerCase().includes("nonaktif"))) {
        await auth.signOut();
        window.location.href = "/masuk?error=banned";
        return;
      }
      throw new Error(data.error || "Gagal memuat profil");
    }
    setProfile(data.profile);
    setError("");
  }, [queryString]);

  useEffect(() => {
    const auth = getAuthClient();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        await loadProfile();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat profil");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [loadProfile]);

  // Real-time banned check (Polling every 30 seconds)
  useEffect(() => {
    const auth = getAuthClient();
    if (!auth.currentUser || !profile) return;

    const interval = setInterval(async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const idToken = await user.getIdToken(true); // Force refresh token to get latest claims
        const qs = queryString ? `?${queryString}` : "";
        const res = await fetch(`/api/admin/me${qs}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        if (res.status === 403) {
          const data = await res.json();
          if (data.error?.toLowerCase().includes("banned") || data.error?.toLowerCase().includes("nonaktif")) {
            await auth.signOut();
            window.location.href = "/masuk?error=banned";
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      }
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [profile, queryString]);

  const adminHref = useCallback(
    (path: string) => appendAdminQuery(path, queryString),
    [queryString]
  );

  return (
    <AdminContext.Provider
      value={{
        profile,
        loading,
        error,
        queryString,
        adminHref,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
