"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { isSupabaseStorageUrl } from "@/utils/isSupabaseStorageUrl";

type ProductPhotoCarouselProps = {
  photos: string[];
  alt: string;
};

const photoShellClassName =
  "relative flex aspect-square w-full max-w-[min(100%,22rem)] items-center justify-center rounded-lg border border-store-line/80 bg-white p-3 shadow-sm sm:max-w-[26rem] " +
  "lg:max-h-full lg:max-w-full lg:min-h-0 lg:min-w-0 lg:shadow-none";

function ProductPhotoFallback() {
  return (
    <div className={`${photoShellClassName} text-center text-sm text-store-navy-muted`}>
      Sem foto
    </div>
  );
}

export function ProductPhotoCarousel({ photos, alt }: ProductPhotoCarouselProps) {
  const normalizedPhotos = useMemo(
    () =>
      photos
        .map((photo) => photo.trim())
        .filter(Boolean)
        .filter((photo, index, arr) => arr.indexOf(photo) === index),
    [photos],
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  if (normalizedPhotos.length === 0) {
    return <ProductPhotoFallback />;
  }

  const hasComplementary = normalizedPhotos.length > 1;
  const currentPhoto = normalizedPhotos[currentIndex] ?? normalizedPhotos[0];
  const currentPositionLabel = `${currentIndex + 1}/${normalizedPhotos.length}`;

  return (
    <div className={photoShellClassName}>
      {hasComplementary ? (
        <button
          type="button"
          className="absolute left-2 z-10 rounded-full border border-store-line/70 bg-white/95 px-2 py-1 text-lg font-semibold text-store-navy shadow-sm transition hover:bg-white"
          aria-label="Foto anterior"
          onClick={() =>
            setCurrentIndex((prev) => (prev - 1 + normalizedPhotos.length) % normalizedPhotos.length)
          }
        >
          {"<"}
        </button>
      ) : null}

      {isSupabaseStorageUrl(currentPhoto) ? (
        <Image
          src={currentPhoto}
          alt={alt}
          fill
          priority={currentIndex === 0}
          sizes="(max-width: 1024px) 90vw, 40vw"
          className="object-contain object-center p-3"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URL absoluta fora do Storage
        <img
          src={currentPhoto}
          alt={alt}
          className="max-h-full max-w-full object-contain object-center"
        />
      )}

      {hasComplementary ? (
        <>
          <button
            type="button"
            className="absolute right-2 z-10 rounded-full border border-store-line/70 bg-white/95 px-2 py-1 text-lg font-semibold text-store-navy shadow-sm transition hover:bg-white"
            aria-label="Próxima foto"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % normalizedPhotos.length)}
          >
            {">"}
          </button>
          <p className="absolute bottom-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
            {currentPositionLabel}
          </p>
        </>
      ) : null}
    </div>
  );
}
