import { CategoriesSection } from "@/features/categorias/components/CategoriesSection";
import { DestaquesSection } from "@/features/produtos/components/DestaquesSection";
import { ProductsSection } from "@/features/produtos/components/ProductsSection";
import { KitsSection } from "@/features/kits/components/KitsSection";
import { KitsDestaqueCards } from "@/features/kits/components/KitsDestaqueCards";
import { getDescontosPadrao } from "@/features/kits/services/kitCombo";
import { createPublicClient } from "@/services/supabase/public";
import { VehicleFilter } from "@/features/compatibilidade/components/VehicleFilter";
import { getVehicleFilterCatalogData } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HomeBeneficiosFaixa } from "@/components/store/HomeBeneficiosFaixa";
import { getHomeCategories } from "@/features/categorias/services/getHomeCategories";
import { getHomeProducts } from "@/features/produtos/services/getHomeProducts";
import { getHomeKits, getKitCategorias, searchPublishedKits } from "@/features/kits/services/getHomeKits";
import { parseHomeVehicleParams, parseProductSearchQ } from "@/features/produtos/utils/catalogSearchParams";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import type { CategoryListItem } from "@/types/category";
import type { KitSummary } from "@/types/kit";
import type { ProductSummary } from "@/types/product";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let categorias: CategoryListItem[] = [];
  let produtosDestaque: ProductSummary[] = [];
  let produtosVitrine: ProductSummary[] = [];
  let kits: KitSummary[] = [];

  const sp = await searchParams;
  const searchQ = parseProductSearchQ(sp);
  const { modeloId, anoVeiculo } = parseHomeVehicleParams(sp);

  const [cats, prods, vehicleFilterData, kitsData, kitCategorias, descontosPadrao] = await Promise.all([
    getHomeCategories(),
    getHomeProducts({ q: searchQ, modeloId, anoVeiculo }),
    getVehicleFilterCatalogData({ modeloIdForAnos: modeloId }),
    searchQ ? searchPublishedKits(searchQ) : getHomeKits(),
    searchQ ? Promise.resolve([]) : getKitCategorias(),
    getDescontosPadrao(createPublicClient()),
  ]);
  const suspensao = kitCategorias.find((c) => c.slug === "suspensao");
  categorias = cats;
  produtosDestaque = prods.destaque;
  produtosVitrine = prods.vitrine;
  kits = kitsData;

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

  const kitsBlock =
    kits.length > 0 || searchQ ? (
      <KitsSection
        kits={kits}
        title={searchQ ? "Kits encontrados" : "Kits"}
        emptyMessage={searchQ ? "Nenhum kit corresponde à busca." : undefined}
        categorias={kitCategorias}
      />
    ) : null;

  const catalogMain = (
    <main className="flex min-h-0 flex-1 flex-col">
      {searchQ ? kitsBlock : null}
      <DestaquesSection produtos={produtosDestaque} emptyMessage={emptyDestaque} />
      <ProductsSection produtos={produtosVitrine} emptyMessage={emptyVitrine} />
      {!searchQ ? kitsBlock : null}
    </main>
  );

  const showResultsAboveVehicleFilter = Boolean(searchQ) && catalogActive;

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <HomeBeneficiosFaixa />
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
          <section className={`bg-store-cream pt-8 sm:pt-10 ${storeShellInset}`}>
            <div className={storeShellContent}>
              <KitsDestaqueCards
                suspensaoHref={suspensao ? `/kits?categoria=${suspensao.slug}` : null}
                descontos={descontosPadrao}
              />
            </div>
          </section>
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
