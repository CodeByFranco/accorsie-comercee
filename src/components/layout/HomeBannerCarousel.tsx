"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

const INTERVAL_MS = 6500;
/** Fallback caso o `onLoad` do 1º banner não dispare (ex.: já estava em cache antes da hidratação). */
const REST_SLIDES_FALLBACK_MS = 2500;

type HomeBannerCarouselProps = {
  srcs: string[];
  /** Largura / altura de referência para proporção (artes 1920×550 px no admin). */
  width?: number;
  height?: number;
};

export function HomeBannerCarousel({
  srcs,
  width = 1920,
  height = 550,
}: HomeBannerCarouselProps) {
  const slides = srcs.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Banners 2+ só entram depois do 1º: não disputam banda com o maior elemento da tela (LCP). */
  const [restReady, setRestReady] = useState(false);
  const dotGroupId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setRestReady(true), REST_SLIDES_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reduceMotion || !restReady) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [slides.length, reduceMotion, restReady]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full max-w-[1920px]"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Banners da página inicial"
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {slides.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={[
              "absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-out",
              i === index ? "z-[1] opacity-100" : "z-0 opacity-0",
            ].join(" ")}
            aria-hidden={i !== index}
          >
            {i === 0 || restReady ? (
              <Image
                src={src}
                alt={i === 0 ? "Accorsi Auto Peças — banner" : `Accorsi Auto Peças — banner ${i + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1920px) 100vw, 1920px"
                priority={i === 0}
                onLoad={i === 0 ? () => setRestReady(true) : undefined}
              />
            ) : null}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div
          className="pointer-events-auto absolute bottom-2 left-0 right-0 z-[2] flex justify-center gap-1.5"
          role="group"
          aria-label="Selecionar banner"
          id={dotGroupId}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Banner ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={[
                "h-2 w-2 rounded-full transition-[transform,background-color] duration-200",
                i === index ? "scale-110 bg-white shadow-sm" : "bg-white/50 hover:bg-white/80",
              ].join(" ")}
              onClick={() => {
                setRestReady(true);
                setIndex(i);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
