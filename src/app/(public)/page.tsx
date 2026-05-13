import { CategoriesSection } from "@/features/categorias/components/CategoriesSection";
import { DestaquesSection } from "@/features/produtos/components/DestaquesSection";
import { ProductsSection } from "@/features/produtos/components/ProductsSection";
import { VehicleFilter } from "@/features/compatibilidade/components/VehicleFilter";
import { getVehicleFilterCatalogData } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getHomeCategories } from "@/features/categorias/services/getHomeCategories";
import { getHomeProducts } from "@/features/produtos/services/getHomeProducts";
import { parseHomeVehicleParams, parseProductSearchQ } from "@/features/produtos/utils/catalogSearchParams";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import type { CategoryListItem } from "@/types/category";
import type { ProductSummary } from "@/types/product";

/** Catálogo marcas/modelos (incl. camionete) deve refletir cadastro no Supabase sem cache de página. */
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let categorias: CategoryListItem[] = [];
  let produtosDestaque: ProductSummary[] = [];
  let produtosVitrine: ProductSummary[] = [];

  const sp = await searchParams;
  const searchQ = parseProductSearchQ(sp);
  const { modeloId, anoVeiculo } = parseHomeVehicleParams(sp);

  const [cats, prods, vehicleFilterData] = await Promise.all([
    getHomeCategories(),
    getHomeProducts({ q: searchQ, modeloId, anoVeiculo }),
    getVehicleFilterCatalogData(),
  ]);
  categorias = cats;
  produtosDestaque = prods.destaque;
  produtosVitrine = prods.vitrine;

  const vehicleFiltering = Boolean(modeloId);
  /** Com busca ou veículo, produtos ficam logo abaixo da área de pesquisa/filtros (categorias depois). */
  const catalogActive = Boolean(searchQ) || vehicleFiltering;
  const emptyDestaque =
    searchQ && vehicleFiltering
      ? "Nenhum destaque combina a busca com o veículo escolhido. Ajuste o texto, o modelo ou o ano."
      : searchQ
        ? "Nenhum destaque corresponde à busca. Tente outro termo ou limpe o campo de pesquisa."
        : vehicleFiltering
          ? "Nenhum destaque compatível com o veículo escolhido. Tente outro modelo ou ano."
          : undefined;
  const emptyVitrine =
    searchQ && vehicleFiltering
      ? "Nenhum produto combina a busca com o veículo escolhido. Ajuste o texto, o modelo ou o ano."
      : searchQ
        ? "Nenhum produto corresponde à busca. Tente outro termo ou limpe o campo de pesquisa."
        : vehicleFiltering
          ? "Nenhum produto compatível com o veículo escolhido. Tente outro modelo ou ano."
          : undefined;

  const catalogMain = (
    <main className="flex min-h-0 flex-1 flex-col">
      <DestaquesSection produtos={produtosDestaque} emptyMessage={emptyDestaque} />
      <ProductsSection produtos={produtosVitrine} emptyMessage={emptyVitrine} />
    </main>
  );

  const showResultsAboveVehicleFilter = Boolean(searchQ) && catalogActive;

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <VehicleFilter
        marcas={vehicleFilterData.marcas}
        modelos={vehicleFilterData.modelos}
        anosByModeloId={vehicleFilterData.anosByModeloId}
        appliedModeloId={modeloId}
        appliedAno={anoVeiculo}
        betweenSearchAndFilter={showResultsAboveVehicleFilter ? catalogMain : undefined}
      />

      {catalogActive ? (
        <>
          {!showResultsAboveVehicleFilter ? catalogMain : null}
          <section className={`border-b border-store-line/50 bg-store-cream py-10 sm:py-12 ${storeShellInset}`}>
            <div className={storeShellContent}>
              <CategoriesSection categorias={categorias} />
            </div>
          </section>
        </>
      ) : (
        <>
          <section className={`border-b border-store-line/50 bg-store-cream py-10 sm:py-12 ${storeShellInset}`}>
            <div className={storeShellContent}>
              <CategoriesSection categorias={categorias} />
            </div>
          </section>

          {catalogMain}
        </>
      )}

      <SiteFooter />
    </div>
  );
}
