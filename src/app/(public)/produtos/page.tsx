import { Suspense } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreProductSearchBar } from "@/components/store/StoreProductSearchBar";
import { getHomeCategories } from "@/features/categorias/services/getHomeCategories";
import { getStoreMarcas } from "@/features/marcas/services/getStoreMarcas";
import { CatalogPagination } from "@/features/produtos/components/CatalogPagination";
import { ProductCatalogFilters } from "@/features/produtos/components/ProductCatalogFilters";
import { ProductsGrid } from "@/features/produtos/components/ProductsGrid";
import {
  CATALOG_PAGE_SIZE,
  getCatalogProducts,
  getCatalogSliderMax,
} from "@/features/produtos/services/getCatalogProducts";
import { getDescontosPadrao } from "@/features/kits/services/kitCombo";
import { COMBO_OLEO_FILTROS_NOME, isKitFiltrosProduto } from "@/features/kits/utils/comboOleo";
import { createPublicClient } from "@/services/supabase/public";
import { getKitCategorias, searchPublishedKits } from "@/features/kits/services/getHomeKits";
import { KitsSection } from "@/features/kits/components/KitsSection";
import { getVehicleFilterCatalogData } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import {
  catalogFiltersToSearchParams,
  catalogFilterSummary,
  catalogFiltersActive,
  normalizeCatalogFilters,
  parseCatalogPage,
  parseCatalogSearchParams,
} from "@/features/produtos/utils/catalogSearchParams";
import { storeShellContent, storeShellInset } from "@/config/storeShell";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requestedPage = parseCatalogPage(sp);

  const [sliderMax, categorias, marcas, kitCategorias] = await Promise.all([
    getCatalogSliderMax(),
    getHomeCategories(),
    getStoreMarcas(),
    getKitCategorias(),
  ]);

  const filters = normalizeCatalogFilters(parseCatalogSearchParams(sp), sliderMax);

  const paginaCombos = isKitFiltrosProduto(filters.q ?? "");
  const [catalogPage, vehicleFilterData, kitsBusca, descontosPadrao] = await Promise.all([
    getCatalogProducts(filters, sliderMax, requestedPage, CATALOG_PAGE_SIZE),
    getVehicleFilterCatalogData({ modeloIdForAnos: filters.modeloId }),
    filters.q?.trim() ? searchPublishedKits(filters.q.trim()) : Promise.resolve([]),
    paginaCombos ? getDescontosPadrao(createPublicClient()) : Promise.resolve(null),
  ]);

  const page =
    catalogPage.totalPages > 0 && requestedPage > catalogPage.totalPages
      ? catalogPage.totalPages
      : catalogPage.page;
  const produtos =
    page !== catalogPage.page && catalogPage.totalPages > 0
      ? (await getCatalogProducts(filters, sliderMax, page, CATALOG_PAGE_SIZE)).produtos
      : catalogPage.produtos;

  const summary = catalogFilterSummary(filters, categorias, marcas, sliderMax);
  const filtering = catalogFiltersActive(filters, sliderMax) || Boolean(filters.q?.trim());
  const emptyMessage = filtering
    ? "Nenhum produto encontrado com os filtros ou a busca atuais. Ajuste e tente de novo."
    : "Nenhum produto cadastrado ainda. Assim que houver itens no catálogo, eles aparecerão aqui.";

  const baseQuery = catalogFiltersToSearchParams(filters, sliderMax);

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <section className={`flex-1 py-10 sm:py-12 ${storeShellInset}`}>
        <div className={storeShellContent}>
          <div
            className={[
              "flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10",
              filtering ? "max-lg:flex-col-reverse" : "",
            ].join(" ")}
          >
            <aside
              className={[
                "w-full shrink-0 self-start",
                "max-h-[min(85dvh,42rem)] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]",
                "lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:w-1/4 lg:max-w-xs",
              ].join(" ")}
            >
              <Suspense
                fallback={
                  <div
                    className="h-72 animate-pulse rounded-sm border border-store-line/60 bg-white"
                    aria-hidden
                  />
                }
              >
                <ProductCatalogFilters
                  categorias={categorias}
                  kitCategorias={kitCategorias}
                  marcas={marcas}
                  sliderMax={sliderMax}
                  modelosVeiculo={vehicleFilterData.modelos}
                  anosByModeloId={vehicleFilterData.anosByModeloId}
                />
              </Suspense>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
              {paginaCombos && descontosPadrao ? (
                <section className="rounded-sm bg-store-navy p-5 text-white md:p-6">
                  <h1 className="text-2xl font-bold md:text-3xl">{COMBO_OLEO_FILTROS_NOME}</h1>
                  <ul className="mt-3 space-y-1 text-sm text-white/90">
                    <li>
                      <strong className="text-store-accent">Só o kit de filtros:</strong>{" "}
                      {descontosPadrao.kit_pix.toLocaleString("pt-BR")}% no PIX ou{" "}
                      {descontosPadrao.kit_cartao.toLocaleString("pt-BR")}% no cartão.
                    </li>
                    <li>
                      <strong className="text-store-accent">Kit + óleo (combo):</strong>{" "}
                      {descontosPadrao.combo_pix.toLocaleString("pt-BR")}% no PIX ou{" "}
                      {descontosPadrao.combo_cartao.toLocaleString("pt-BR")}% no cartão, em até 3x sem juros.
                    </li>
                  </ul>
                  <p className="mt-3 text-xs text-white/70">
                    Escolha o modelo do seu carro no filtro, abra o kit e, em &quot;Leve junto: óleo&quot;, escolha o óleo
                    e a quantidade.
                  </p>
                </section>
              ) : null}
              <Suspense
                fallback={
                  <div className="h-12 w-full max-w-xl animate-pulse rounded-full bg-[#3a3a3a]/50" aria-hidden />
                }
              >
                <StoreProductSearchBar className="max-w-xl" />
              </Suspense>

              <header className="mb-0 sm:mb-0" aria-labelledby="catalog-produtos-heading">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                    <h1
                      id="catalog-produtos-heading"
                      className="text-2xl font-bold tracking-tight text-black sm:text-3xl"
                    >
                      Produtos
                    </h1>
                    <p className="text-sm font-normal text-store-navy-muted sm:pb-0.5">— {summary}</p>
                  </div>
                  <div className="mt-2 h-1 w-14 rounded-[1px] bg-store-navy sm:w-16" aria-hidden />
                  {catalogPage.total > 0 ? (
                    <p className="mt-2 text-xs text-store-navy-muted tabular-nums">
                      {catalogPage.total} produto{catalogPage.total === 1 ? "" : "s"}
                      {catalogPage.totalPages > 1
                        ? ` · página ${page} de ${catalogPage.totalPages}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </header>

              {kitsBusca.length > 0 ? (
                <KitsSection kits={kitsBusca} title="Kits encontrados" embedded />
              ) : null}

              <ProductsGrid variant="catalog" produtos={produtos} emptyMessage={emptyMessage} />
              <CatalogPagination
                page={page}
                totalPages={catalogPage.totalPages}
                baseQuery={baseQuery}
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
