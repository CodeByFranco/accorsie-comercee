"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function pageTitle(pathname: string): string {
  if (pathname === "/admin") return "Visão geral";
  if (pathname === "/admin/produtos") return "Produtos";
  if (pathname === "/admin/pedidos") return "Pedidos";
  if (/^\/admin\/pedidos\/[^/]+$/.test(pathname)) return "Detalhe do pedido";
  if (pathname === "/admin/marcas-e-modelos") return "Marcas e modelos";
  if (pathname === "/admin/consulta-fipe") return "Consulta FIPE";
  if (pathname === "/admin/marcas") return "Marcas e modelos";
  if (pathname === "/admin/modelos") return "Marcas e modelos";
  if (pathname === "/admin/categorias") return "Categorias";
  if (pathname === "/admin/layout") return "Layout do site";
  if (pathname === "/admin/clientes") return "Clientes";
  if (pathname === "/admin/cupons") return "Cupons";
  if (pathname === "/admin/produtos/novo") return "Cadastrar produto";
  if (/^\/admin\/produtos\/[^/]+\/edit$/.test(pathname)) return "Editar produto";
  return "Painel";
}

function IconCar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 11l1.5-4h11L19 11M5 11h14v5H5v-5zm2.5 0V9M16.5 11V9M7 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOverview({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5H4V5zm0 7h6v8H5a1 1 0 0 1-1-1v-7zm8-8h4a1 1 0 0 1 1 1v4h-6V4zm0 6h6v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconPackage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L4 6v5c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 22V12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 19v-1a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0v-1a3 3 0 0 0-6 0v1m6 0a3 3 0 0 0 6 0v-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLayers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLayoutPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zm10 0h6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 15a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4zm10 0h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 5a2 2 0 0 1 2-2h4.172a2 2 0 0 1 1.414.586l10 10a2 2 0 0 1 0 2.828l-4.172 4.172a2 2 0 0 1-2.828 0l-10-10A2 2 0 0 1 3 9.172V5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconFipeTable({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M10 5v14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShoppingCart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 4h2l2.2 10.1a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.5" fill="currentColor" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }
  const title = pageTitle(pathname);
  const overviewActive = pathname === "/admin";
  const productsActive = pathname.startsWith("/admin/produtos");
  const pedidosActive = pathname.startsWith("/admin/pedidos");
  const marcasModelosActive =
    pathname.startsWith("/admin/marcas-e-modelos") ||
    pathname.startsWith("/admin/marcas") ||
    pathname.startsWith("/admin/modelos");
  const categoriasActive = pathname.startsWith("/admin/categorias");
  const layoutSiteActive = pathname.startsWith("/admin/layout");
  const clientesActive = pathname.startsWith("/admin/clientes");
  const cuponsActive = pathname.startsWith("/admin/cupons");
  const consultaFipeActive = pathname.startsWith("/admin/consulta-fipe");

  const navLinkClass = (active: boolean) =>
    [
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-[#1d63ed]/20 text-white"
        : "text-gray-400 hover:bg-white/[0.06] hover:text-white",
    ].join(" ");

  return (
    <div className="min-h-screen bg-admin-canvas text-gray-900">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id="admin-sidebar"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/5 bg-admin-sidebar transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none",
        ].join(" ")}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-admin-accent text-white">
            <IconCar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white">Accorsi Auto Peças</p>
            <p className="text-xs text-gray-500">Painel admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Principal">
          <Link href="/admin" className={navLinkClass(overviewActive)}>
            <IconOverview className="h-5 w-5 shrink-0 opacity-80" />
            Visão geral
          </Link>
          <Link href="/admin/produtos" className={navLinkClass(productsActive)}>
            <IconPackage className="h-5 w-5 shrink-0 opacity-80" />
            Produtos
          </Link>
          <Link href="/admin/marcas-e-modelos" className={navLinkClass(marcasModelosActive)}>
            <IconLayers className="h-5 w-5 shrink-0 opacity-80" />
            Marcas e modelos
          </Link>
          <Link href="/admin/consulta-fipe" className={navLinkClass(consultaFipeActive)}>
            <IconFipeTable className="h-5 w-5 shrink-0 opacity-80" />
            Consulta FIPE
          </Link>
          <Link href="/admin/categorias" className={navLinkClass(categoriasActive)}>
            <IconTag className="h-5 w-5 shrink-0 opacity-80" />
            Categorias
          </Link>
          <Link href="/admin/layout" className={navLinkClass(layoutSiteActive)}>
            <IconLayoutPanel className="h-5 w-5 shrink-0 opacity-80" />
            Layout
          </Link>
          <Link href="/admin/pedidos" className={navLinkClass(pedidosActive)}>
            <IconShoppingCart className="h-5 w-5 shrink-0 opacity-80" />
            Pedidos
          </Link>
          <Link href="/admin/cupons" className={navLinkClass(cuponsActive)}>
            <IconTag className="h-5 w-5 shrink-0 opacity-80" />
            Cupons
          </Link>
          <Link href="/admin/clientes" className={navLinkClass(clientesActive)}>
            <IconUsers className="h-5 w-5 shrink-0 opacity-80" />
            Clientes
          </Link>
        </nav>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-gray-200/80 bg-white px-4 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="admin-sidebar"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {pathname === "/admin" && (
              <Link
                href="/admin/produtos"
                className="hidden rounded-lg bg-admin-accent px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1857d1] sm:inline-flex"
              >
                Gerenciar produtos
              </Link>
            )}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Notificações"
            >
              <IconBell className="h-5 w-5" />
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-admin-accent text-xs font-semibold text-white"
              title="Administrador"
            >
              AD
            </div>
          </div>
        </header>

        {pathname === "/admin" && (
          <div className="border-b border-gray-200/80 bg-white px-4 py-3 sm:hidden">
            <Link
              href="/admin/produtos"
              className="flex w-full items-center justify-center rounded-lg bg-admin-accent py-2.5 text-sm font-medium text-white"
            >
              Gerenciar produtos
            </Link>
          </div>
        )}

        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
