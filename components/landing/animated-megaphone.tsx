"use client";

type AnimatedMegaphoneProps = {
  className?: string;
};

export function AnimatedMegaphone({ className }: AnimatedMegaphoneProps) {
  return (
    <div
      className={`mega-float-anim w-full h-full flex items-center justify-center ${className ?? ""}`}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/megaphone-ref.png"
        alt=""
        width={480}
        height={480}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="w-[88%] h-[88%] max-w-[480px] object-contain"
      />
    </div>
  );
}

export const AnimatedSpeaker = AnimatedMegaphone;
