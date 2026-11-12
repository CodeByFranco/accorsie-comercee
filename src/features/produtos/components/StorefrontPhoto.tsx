"use client";

import { useEffect, useState } from "react";

/** `null` = não deu para limpar; mostra o arquivo original. */
const cache = new Map<string, string | null>();

function isBackdrop(r: number, g: number, b: number, a: number) {
  if (a < 12) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (r + g + b) / 3;
  return light >= 196 && max - min <= 26;
}

/** Tira o fundo branco ou cinza-claro colado na borda e encaixa o produto num quadrado. */
function prepareSquare(img: HTMLImageElement): string | null {
  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const d = imageData.data;
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];

  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const i = p * 4;
    if (!isBackdrop(d[i], d[i + 1], d[i + 2], d[i + 3])) return;
    visited[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop()!;
    const i = p * 4;
    d[i + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (d[i + 3] < 12) continue;
      const touchesClear =
        d[(p - 1) * 4 + 3] < 12 ||
        d[(p + 1) * 4 + 3] < 12 ||
        d[(p - w) * 4 + 3] < 12 ||
        d[(p + w) * 4 + 3] < 12;
      if (!touchesClear) continue;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const light = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (light >= 176 && sat <= 32) d[i + 3] = 0;
    }
  }

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let opaque = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 16) {
        opaque++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || opaque < w * h * 0.04) return null;

  ctx.putImageData(imageData, 0, 0);

  const side = 480;
  const pad = Math.round(side * 0.05);
  const out = document.createElement("canvas");
  out.width = side;
  out.height = side;
  const octx = out.getContext("2d");
  if (!octx) return null;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const inner = side - pad * 2;
  const fit = Math.min(inner / bw, inner / bh);
  const dw = bw * fit;
  const dh = bh * fit;
  octx.drawImage(canvas, minX, minY, bw, bh, (side - dw) / 2, (side - dh) / 2, dw, dh);
  return out.toDataURL("image/png");
}

export function StorefrontPhoto({
  src,
  alt,
  className = "h-full w-full object-contain object-center",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [ready, setReady] = useState<{ src: string; url: string | null } | null>(null);
  const cached = src ? cache.get(src) : undefined;
  const processed = cached !== undefined ? cached : ready?.src === src ? ready.url : undefined;
  const shown = !src ? null : processed === undefined ? src : (processed ?? src);

  useEffect(() => {
    if (!src || cache.has(src)) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let next: string | null = null;
      try {
        next = prepareSquare(img);
      } catch {
        next = null;
      }
      cache.set(src, next);
      if (!cancelled) setReady({ src, url: next });
    };
    img.onerror = () => {
      cache.set(src, null);
      if (!cancelled) setReady({ src, url: null });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-store-navy-muted">
        Sem foto
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- foto tratada no canvas, fora do otimizador
    <img src={shown ?? src} alt={alt} className={`absolute inset-0 ${className}`} />
  );
}
