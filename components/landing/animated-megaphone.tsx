"use client";

type AnimatedMegaphoneProps = {
  className?: string;
};

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function AnimatedMegaphone({ className }: AnimatedMegaphoneProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mencegah hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className ?? ""}`} />
    );
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const imgSrc = currentTheme === "dark" ? "/white.png" : "/megaphone-ref.png";

  return (
    <div
      className={`mega-float-anim w-full h-full flex items-center justify-center ${className ?? ""}`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        width={480}
        height={480}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="w-[88%] h-[88%] max-w-[480px] object-contain transition-opacity duration-300"
      />
    </div>
  );
}

export const AnimatedSpeaker = AnimatedMegaphone;
