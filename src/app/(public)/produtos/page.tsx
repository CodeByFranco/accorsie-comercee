import { Suspense } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreProductSearchBar } from "@/components/store/StoreProductSearchBar";
import { getHomeCategories } from "@/features/categorias/services/getHomeCategories";
import { getStoreMarcas } from "@/features/marcas/services/getStoreMarcas";
import { ProductCatalogFilters } from "@/features/produtos/components/ProductCatalogFilters";
import { ProductsGrid } from "@/features/produtos/components/ProductsGrid";
import { getCatalogProducts, getCatalogSliderMax } from "@/features/produtos/services/getCatalogProducts";
import { getVehicleFilterCatalogData } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import {
  catalogFilterSummary,
  catalogFiltersActive,
  normalizeCatalogFilters,
  parseCatalogSearchParams,
} from "@/features/produtos/utils/catalogSearchParams";
import { storeShellContent, storeShellInset } from "@/config/storeShell";

/** Filtro por veículo usa o mesmo catálogo da home; evita lista desatualizada após alterações no admin. */
export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sliderMax = await getCatalogSliderMax();
  const filters = normalizeCatalogFilters(parseCatalogSearchParams(sp), sliderMax);

  const [categorias, marcas, produtos, vehicleFilterData] = await Promise.all([
    getHomeCategories(),
    getStoreMarcas(),
    getCatalogProducts(filters, sliderMax),
    getVehicleFilterCatalogData(),
  ]);

  const summary = catalogFilterSummary(filters, categorias, marcas, sliderMax);
  const filtering = catalogFiltersActive(filters, sliderMax) || Boolean(filters.q?.trim());
  const emptyMessage = filtering
    ? "Nenhum produto encontrado com os filtros ou a busca atuais. Ajuste e tente de novo."
    : "Nenhum produto cadastrado ainda. Assim que houver itens no catálogo, eles aparecerão aqui.";

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
                  marcas={marcas}
                  sliderMax={sliderMax}
                  modelosVeiculo={vehicleFilterData.modelos}
                  anosByModeloId={vehicleFilterData.anosByModeloId}
                />
              </Suspense>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
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
                </div>
              </header>

              <ProductsGrid variant="catalog" produtos={produtos} emptyMessage={emptyMessage} />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
