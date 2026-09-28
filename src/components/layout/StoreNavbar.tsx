"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";

import { StoreProductSearchBar } from "@/components/store/StoreProductSearchBar";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import { CART_ICON_SRC } from "@/features/carrinho/constants";
import { useCart } from "@/features/carrinho/CartContext";
import { HomeBannerCarousel } from "@/components/layout/HomeBannerCarousel";
import {
  buildCatalogQueryString,
  parseCatalogSearchParamsFromUrlSearchParams,
} from "@/features/produtos/utils/catalogSearchParams";
import type { CategoryListItem } from "@/types/category";

const LINK_NAV_AFTER_CATEGORIAS = [
  { href: "/produtos", label: "PRODUTOS" },
  { href: "/sobre", label: "SOBRE NÓS" },
] as const;

const ICON_GARAGE = "/icons/garagem%201.png";
const ICON_PROFILE = "/icons/perfil.png";

const HOME_LOGO = "/home/logo-removebg-preview%20%281%29.png";
const HOME_LOGO_MOBILE = "/home/logo-navbar-mobile.png";

/** Base em px para Next/Image; o tamanho na tela vem das classes (mobile menor que sm+). */
const ICON_PX = 32;
const iconImgClass = "h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8";

/** Mesmo ponto do breakpoint `xl` do Tailwind (1280px). */
const DESKTOP_NAV_MIN_PX = 1280;

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 15l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export type StoreNavbarAccountUser = {
  email: string;
};

type StoreNavbarProps = {
  categorias: CategoryListItem[];
  catalogSliderMax: number;
  /** URLs dos banners da home (rotação). Pelo menos uma (fallback no layout se vazio no banco). */
  homeBannerSrcs: string[];
  /** Quando definido, o ícone de perfil leva à área logada; caso contrário, ao login. */
  accountUser: StoreNavbarAccountUser | null;
  garageVehicles: {
    id: number;
    placa: string;
    marca: string | null;
    modelo: string | null;
    modelo_id: string | null;
    ano: number | null;
  }[];
  /** Link discreto para o painel (somente role admin). */
  showAdminLink?: boolean;
};

function navLinkClass(active: boolean) {
  return [
    "inline-flex shrink-0 items-center whitespace-nowrap py-1 text-sm font-bold uppercase tracking-wide transition-colors",
    active
      ? "border-b-2 border-store-navy text-store-navy"
      : "border-b-2 border-transparent text-store-navy-muted hover:text-store-accent",
  ].join(" ");
}

function mobileNavRowClass(active: boolean) {
  return [
    "rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors active:scale-[0.99]",
    active ? "bg-store-subtle text-store-navy" : "text-store-navy-muted hover:bg-store-subtle/90 hover:text-store-navy",
  ].join(" ");
}

export function StoreNavbar({
  categorias,
  catalogSliderMax,
  homeBannerSrcs,
  accountUser,
  garageVehicles,
  showAdminLink = false,
}: StoreNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const showHomeBanner = pathname === "/";
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isDesktopNav, setIsDesktopNav] = useState(false);
  const [garageModalOpen, setGarageModalOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const categoriasWrapRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const closeCategorias = useCallback(() => setCategoriasOpen(false), []);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    if (!categoriasOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = categoriasWrapRef.current;
      if (el && !el.contains(e.target as Node)) closeCategorias();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCategorias();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [categoriasOpen, closeCategorias]);

  useEffect(() => {
    const syncViewport = () => {
      const desktop = window.innerWidth >= DESKTOP_NAV_MIN_PX;
      setIsDesktopNav(desktop);
      if (desktop) setMobileNavOpen(false);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
    setCategoriasOpen(false);
    setGarageModalOpen(false);
    setProductSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!productSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductSearchOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [productSearchOpen]);

  useEffect(() => {
    if (!productSearchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [productSearchOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openFromHash = () => {
      if (window.location.hash !== "#categorias") return;
      if (window.innerWidth >= DESKTOP_NAV_MIN_PX) {
        setCategoriasOpen(true);
        setMobileNavOpen(false);
      } else {
        setMobileNavOpen(true);
        setCategoriasOpen(false);
      }
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const openGarage = () => {
    if (!accountUser) {
      router.push("/login?next=%2F");
      return;
    }
    if (pathname === "/") {
      setGarageModalOpen(true);
      return;
    }
    router.push("/conta?aba=garagem");
  };

  const applyCategoriaFilter = (categoriaId: string) => {
    closeCategorias();
    closeMobileNav();
    const onCatalog = pathname === "/produtos" || pathname.startsWith("/produtos/");
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const current = parseCatalogSearchParamsFromUrlSearchParams(params);
    const next = { ...current, categoriaIds: [categoriaId] };
    const qs = buildCatalogQueryString(next, catalogSliderMax);
    if (onCatalog) {
      router.replace(`/produtos${qs}`, { scroll: false });
    } else {
      router.push(`/produtos${qs}`);
    }
  };

  return (
    <header className="text-store-navy">
      <div className="sticky top-0 z-[100] bg-store-cream shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
        <div className={storeShellInset}>
          <div className={storeShellContent}>
            <div className="px-1 sm:px-2">
            <div className="flex items-center gap-1 py-1 sm:gap-2 xl:gap-4">
              <Link
                href="/"
                className="min-w-0 max-w-[6.75rem] shrink self-center overflow-hidden rounded-sm outline-none ring-store-navy/30 focus-visible:ring-2 sm:max-w-[11rem] xl:max-w-[17rem]"
                aria-label="Accorsi Auto Peças — início"
              >
                <Image
                  src={HOME_LOGO_MOBILE}
                  alt="Accorsi Auto Peças"
                  width={240}
                  height={72}
                  className="h-8 w-auto max-w-full object-contain object-left sm:hidden"
                  sizes="6.75rem"
                  unoptimized
                />
                <Image
                  src={HOME_LOGO}
                  alt="Accorsi Auto Peças"
                  width={300}
                  height={96}
                  className="hidden h-12 w-auto max-w-full object-contain object-left sm:block xl:h-16"
                  sizes="(max-width: 1279px) 11rem, 17rem"
                  unoptimized
                />
              </Link>
              {isDesktopNav ? (
                <nav
                  className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-x-4 whitespace-nowrap xl:flex xl:gap-x-6"
                  aria-label="Principal"
                >
                <Link href="/" className={navLinkClass(pathname === "/")}>
                  INÍCIO
                </Link>

                <div
                  ref={categoriasWrapRef}
                  className={[
                    "relative shrink-0",
                    categoriasOpen ? "z-[110]" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    className={navLinkClass(categoriasOpen)}
                    aria-expanded={categoriasOpen}
                    aria-haspopup="listbox"
                    aria-controls={categoriasOpen ? listboxId : undefined}
                    onClick={() => setCategoriasOpen((v) => !v)}
                  >
                    CATEGORIAS
                  </button>
                  {categoriasOpen ? (
                    <div
                      id={listboxId}
                      role="listbox"
                      aria-label="Categorias"
                      className="store-nav-categorias-dropdown absolute left-1/2 top-full z-[120] mt-1 min-w-[12rem] max-w-[min(calc(100vw-2rem),18rem)] -translate-x-1/2 rounded-sm border border-store-line/80 bg-white py-1 shadow-lg sm:left-0 sm:translate-x-0"
                    >
                      {categorias.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-store-navy-muted">Nenhuma categoria cadastrada.</p>
                      ) : (
                        <ul className="max-h-[min(70vh,20rem)] overflow-y-auto py-0.5">
                          {categorias.map((c) => (
                            <li key={c.id} role="presentation">
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                className="flex w-full items-center px-3 py-2 text-left text-sm font-medium text-store-navy transition hover:bg-store-subtle/90"
                                onClick={() => applyCategoriaFilter(c.id)}
                              >
                                {c.nome}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>

                {LINK_NAV_AFTER_CATEGORIAS.map(({ href, label }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link key={href} href={href} className={navLinkClass(active)}>
                      {label}
                    </Link>
                  );
                })}
                </nav>
              ) : null}

              <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 xl:gap-3">
                <button
                  type="button"
                  onClick={openGarage}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-store-line bg-store-subtle px-1.5 py-1.5 text-left transition hover:border-store-navy-muted/50 xl:gap-2.5 xl:px-4 xl:py-2"
                  aria-label="Minha garagem"
                >
                  <Image
                    src={ICON_GARAGE}
                    alt=""
                    width={ICON_PX}
                    height={ICON_PX}
                    className={iconImgClass}
                  />
                  <span className="hidden min-w-0 leading-tight xl:block">
                    <span className="block text-sm font-bold text-store-navy">Minha Garagem</span>
                    <span className="block text-xs font-normal text-store-navy-muted">
                      Adicione seu veículo
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductSearchOpen(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/30 transition hover:bg-zinc-800 sm:h-10 sm:w-10"
                  aria-label="Buscar produtos"
                  title="Buscar produtos"
                >
                  <IconSearch className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </button>
                <Link
                  href="/carrinho"
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-black/[0.04] sm:h-10 sm:w-10"
                  aria-label={itemCount > 0 ? `Carrinho, ${itemCount} itens` : "Carrinho"}
                >
                  <Image
                    src={CART_ICON_SRC}
                    alt=""
                    width={ICON_PX}
                    height={ICON_PX}
                    className={iconImgClass}
                  />
                  {itemCount > 0 ? (
                    <span className="absolute -right-0 -top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#1d63ed] px-0.5 text-[9px] font-bold leading-none text-white sm:-right-0.5 sm:-top-0.5 sm:h-[1.125rem] sm:min-w-[1.125rem] sm:px-1 sm:text-[10px]">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </Link>
                {accountUser && showAdminLink ? (
                  <Link
                    href="/admin"
                    className="hidden items-center whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-store-navy-muted transition hover:bg-black/[0.04] hover:text-store-navy xl:flex"
                  >
                    Admin
                  </Link>
                ) : null}
                {accountUser ? (
                  <Link
                    href="/conta"
                    className="hidden h-9 w-9 items-center justify-center rounded-lg transition hover:bg-black/[0.04] xl:flex xl:h-10 xl:w-10"
                    aria-label="Minha conta"
                  >
                    <Image
                      src={ICON_PROFILE}
                      alt=""
                      width={ICON_PX}
                      height={ICON_PX}
                      className={iconImgClass}
                    />
                  </Link>
                ) : (
                  <Link
                    href="/login?next=%2Fconta"
                    className="hidden h-9 w-9 items-center justify-center rounded-lg transition hover:bg-black/[0.04] xl:flex xl:h-10 xl:w-10"
                    aria-label="Entrar"
                  >
                    <Image
                      src={ICON_PROFILE}
                      alt=""
                      width={ICON_PX}
                      height={ICON_PX}
                      className={iconImgClass}
                    />
                  </Link>
                )}
                {!isDesktopNav ? (
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-store-line/80 text-store-navy transition hover:bg-store-subtle sm:h-10 sm:w-10 xl:hidden"
                    aria-expanded={mobileNavOpen}
                    aria-controls="store-mobile-nav"
                    aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
                    onClick={() => setMobileNavOpen((o) => !o)}
                  >
                    <IconMenu className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mx-auto h-0.5 w-3/4 bg-store-navy" />

          {mobileNavOpen && !isDesktopNav ? (
            <div
              id="store-mobile-nav"
              className="store-nav-categorias-dropdown border-b border-store-line/50 bg-white px-4 py-3 shadow-sm xl:hidden"
            >
              <nav className="mx-auto flex max-w-store flex-col gap-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]" aria-label="Principal">
                <Link href="/" className={mobileNavRowClass(pathname === "/")} onClick={closeMobileNav}>
                  Início
                </Link>
                <div className="rounded-lg border border-store-line/60 bg-white/80 px-1 py-1">
                  <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-store-navy-muted">
                    Categorias
                  </p>
                  {categorias.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-store-navy-muted">Nenhuma categoria cadastrada.</p>
                  ) : (
                    <ul className="max-h-[min(50vh,16rem)] space-y-0.5 overflow-y-auto">
                      {categorias.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="flex w-full rounded-md px-2 py-2 text-left text-sm font-medium text-store-navy transition hover:bg-store-subtle/90"
                            onClick={() => applyCategoriaFilter(c.id)}
                          >
                            {c.nome}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {LINK_NAV_AFTER_CATEGORIAS.map(({ href, label }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link key={href} href={href} className={mobileNavRowClass(active)} onClick={closeMobileNav}>
                      {label}
                    </Link>
                  );
                })}
                {accountUser && showAdminLink ? (
                  <Link
                    href="/admin"
                    className={mobileNavRowClass(pathname.startsWith("/admin"))}
                    onClick={closeMobileNav}
                  >
                    Painel admin
                  </Link>
                ) : null}
                {accountUser ? (
                  <Link
                    href="/conta"
                    className={mobileNavRowClass(pathname === "/conta" || pathname.startsWith("/conta/"))}
                    onClick={closeMobileNav}
                  >
                    Minha conta
                  </Link>
                ) : (
                  <Link
                    href="/login?next=%2Fconta"
                    className={mobileNavRowClass(pathname.startsWith("/login"))}
                    onClick={closeMobileNav}
                  >
                    Entrar
                  </Link>
                )}
                {accountUser && pathname === "/" ? (
                  <button
                    type="button"
                    className={mobileNavRowClass(false)}
                    onClick={() => {
                      closeMobileNav();
                      setGarageModalOpen(true);
                    }}
                  >
                    Minha garagem
                  </button>
                ) : (
                  <Link
                    href={accountUser ? "/conta?aba=garagem" : "/login?next=%2Fconta%3Faba%3Dgaragem"}
                    className={mobileNavRowClass(false)}
                    onClick={closeMobileNav}
                  >
                    Minha garagem
                  </Link>
                )}
              </nav>
            </div>
          ) : null}
          </div>
        </div>
      </div>

      {showHomeBanner ? (
        <div className="relative mt-3 w-full overflow-x-hidden bg-store-navy sm:mt-4">
          <div className="relative mx-auto flex w-full max-w-[1920px] justify-center">
            <HomeBannerCarousel srcs={homeBannerSrcs} />
          </div>
        </div>
      ) : null}

      {productSearchOpen ? (
        <div
          className="fixed inset-0 z-[140] flex items-start justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:pt-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-navbar-search-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar busca"
            onClick={() => setProductSearchOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-store-line bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 id="store-navbar-search-title" className="text-base font-black text-store-navy sm:text-lg">
                Buscar produtos
              </h3>
              <button
                type="button"
                onClick={() => setProductSearchOpen(false)}
                className="rounded-lg border border-store-line px-2 py-1 text-xs font-bold text-store-navy"
              >
                Fechar
              </button>
            </div>
            <p className="mt-1 text-xs text-store-navy-muted">A busca atualiza a lista conforme você digita.</p>
            <div className="mt-4">
              <Suspense
                fallback={<div className="h-12 w-full animate-pulse rounded-full bg-zinc-200/80" aria-hidden />}
              >
                <StoreProductSearchBar autoFocus className="max-w-none" />
              </Suspense>
            </div>
          </div>
        </div>
      ) : null}

      {garageModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-xl rounded-2xl border border-store-line bg-white p-4 text-store-navy shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black sm:text-lg">Minha garagem</h3>
                <p className="mt-1 text-xs text-store-navy-muted">Selecione um veículo para filtrar peças.</p>
              </div>
              <button
                type="button"
                onClick={() => setGarageModalOpen(false)}
                className="rounded-lg border border-store-line px-2 py-1 text-xs font-bold text-store-navy"
              >
                Fechar
              </button>
            </div>

            {garageVehicles.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-store-line/90 bg-store-subtle/20 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-store-navy">Você ainda não tem veículos salvos.</p>
                <p className="mt-2 text-sm text-store-navy-muted">
                  Consulte sua placa no topo da home e adicione seu veículo à garagem.
                </p>
              </div>
            ) : (
              <ul className="mt-4 max-h-[min(60vh,24rem)] space-y-2.5 overflow-y-auto pr-0.5">
                {garageVehicles.map((vehicle) => {
                  const qs = new URLSearchParams();
                  if (vehicle.modelo_id) qs.set("modelo", vehicle.modelo_id);
                  if (vehicle.ano != null) qs.set("ano", String(vehicle.ano));
                  const href = `/produtos${qs.toString() ? `?${qs.toString()}` : ""}`;
                  const descricao = [vehicle.marca, vehicle.modelo].filter(Boolean).join(" - ") || "Veículo";
                  return (
                    <li
                      key={vehicle.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-store-line/70 bg-store-subtle/15 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold uppercase tracking-[0.12em] text-store-navy">{vehicle.placa}</p>
                        <p className="mt-0.5 text-xs text-store-navy-muted">
                          {descricao}
                          {vehicle.ano != null ? ` (${vehicle.ano})` : ""}
                        </p>
                      </div>
                      <Link
                        href={href}
                        onClick={() => setGarageModalOpen(false)}
                        className="inline-flex shrink-0 rounded-md bg-store-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-store-navy/90"
                      >
                        Filtrar
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
