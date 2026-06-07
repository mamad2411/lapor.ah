"use client";

import { useEffect } from "react";

/**
 * Komponen untuk membersihkan Service Worker yang mungkin tertinggal dari sesi sebelumnya
 * guna mencegah error "Cache.put()" di browser pengguna.
 */
export function ServiceWorkerCleaner() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Opsional: Hapus cache lama jika ada
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  }, []);

  return null;
}
