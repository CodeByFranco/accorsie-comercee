"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CategoryListItem } from "@/types/category";
import { isSupabaseStorageUrl } from "@/utils/isSupabaseStorageUrl";

export type { CategoryListItem };

type CategoriesSectionProps = {
  categorias: CategoryListItem[];
};

function normalizeIconSrc(icone: string | null): string | null {
  if (!icone?.trim()) return null;
  const t = icone.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

const headingId = "home-categories-heading";

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CategoriesSection({ categorias }: CategoriesSectionProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 1;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > 2);
    setCanScrollRight(overflow && scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);

    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categorias, updateScrollState]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.max(240, Math.floor(el.clientWidth * 0.85)) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (categorias.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-store-line/70 bg-white/50 px-6 py-10 text-center text-sm text-store-navy-muted"
        role="status"
      >
        Em breve as categorias aparecerão aqui.
      </div>
    );
  }

  return (
    <div aria-labelledby={headingId}>
      <h2 id={headingId} className="text-center text-lg font-bold text-store-navy sm:text-xl">
        Categorias
      </h2>
      {hasOverflow ? (
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] font-semibold text-store-navy-muted md:hidden">
          <IconChevronLeft className="h-3.5 w-3.5" />
          Arraste para o lado para ver mais categorias
          <IconChevronRight className="h-3.5 w-3.5" />
        </p>
      ) : null}
      <div className="relative mt-6">
        {hasOverflow && canScrollLeft ? (
          <button
            type="button"
            className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-store-line/80 bg-white/95 text-store-navy shadow-md transition hover:bg-store-subtle md:flex"
            aria-label="Categorias anteriores"
            onClick={() => scrollByDir(-1)}
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        {hasOverflow && canScrollRight ? (
          <button
            type="button"
            className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-store-line/80 bg-white/95 text-store-navy shadow-md transition hover:bg-store-subtle md:flex"
            aria-label="Próximas categorias"
            onClick={() => scrollByDir(1)}
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        ) : null}

        <ul
          ref={scrollerRef}
          className={[
            "flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 pt-0.5",
            "scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            hasOverflow ? "md:px-12" : "",
          ].join(" ")}
        >
          {categorias.map((c) => {
            const src = normalizeIconSrc(c.icone);
            const href = `/produtos?categorias=${encodeURIComponent(c.id)}`;
            return (
              <li
                key={c.id}
                className={[
                  "shrink-0 snap-start",
                  /* Mobile: ~3 cards por linha (gap-3 → 2×0,75rem entre 3 itens). */
                  "w-[calc((100%-1.5rem)/3)] min-w-[6.5rem]",
                  /* md+: 7 cards visíveis antes da rolagem (6×0,75rem de gap). */
                  "md:w-[calc((100%-4.5rem)/7)] md:min-w-0 md:max-w-[calc((100%-4.5rem)/7)]",
                ].join(" ")}
              >
                <Link
                  href={href}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border border-store-line/80 bg-white px-3 py-4 text-center shadow-sm transition hover:border-store-navy/25 hover:shadow-md"
                >
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden text-lg font-semibold text-store-navy">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                        unoptimized={!isSupabaseStorageUrl(src)}
                      />
                    ) : (
                      <span className="text-store-accent" aria-hidden>
                        {c.nome.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-snug text-store-navy sm:text-sm">
                    {c.nome}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
