"use client";

import { useEffect, useRef } from "react";

export function AnimatedWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const visibleRef = useRef(false);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const chars = "·∘○◯";
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { rootMargin: "120px", threshold: 0 }
    );
    observer.observe(canvas);

    const render = () => {
      frameRef.current = requestAnimationFrame(render);

      if (!visibleRef.current) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      timeRef.current += 0.02;
      const time = timeRef.current;

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const step = 28;
      const cols = Math.ceil(rect.width / step);
      const rows = Math.ceil(rect.height / step);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * step;
          const py = (y + 0.5) * step;

          const wave1 = Math.sin(x * 0.15 + time * 1.5) * Math.cos(y * 0.12 + time);
          const wave2 = Math.sin((x + y) * 0.08 + time);
          const combined = (wave1 + wave2) / 2;
          const normalized = (combined + 1) / 2;

          const charIndex = Math.floor(normalized * (chars.length - 1));
          ctx.fillStyle = `rgba(0, 0, 0, ${0.12 + normalized * 0.35})`;
          ctx.fillText(chars[charIndex], px, py);
        }
      }
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
      aria-hidden
    />
  );
}
