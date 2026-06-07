"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Memastikan setiap kali pathname (URL) berubah, scroll akan kembali ke paling atas
    const resetScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
      // Juga pastikan body dan html kembali ke atas
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
    };

    resetScroll();

    // Gunakan timeout kecil sebagai cadangan jika render belum selesai
    const timer = setTimeout(resetScroll, 10);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
