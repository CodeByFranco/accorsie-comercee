import { CategoriesSection } from "@/features/categorias/components/CategoriesSection";
import { CombosExemploHomeSection } from "@/features/kits/components/CombosExemploHomeSection";
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
import { getKitCategorias, getPublishedKits, searchPublishedKits } from "@/features/kits/services/getHomeKits";
import { getCatalogProducts, getCatalogSliderMax } from "@/features/produtos/services/getCatalogProducts";
import { normalizeCatalogFilters } from "@/features/produtos/utils/catalogSearchParams";
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
  let produtosVitrine: ProductSummary[] = [];
  let kitsFiltroExemplo: ProductSummary[] = [];
  let kitsSuspensaoExemplo: KitSummary[] = [];
  let kits: KitSummary[] = [];

  const sp = await searchParams;
  const searchQ = parseProductSearchQ(sp);
  const { modeloId, anoVeiculo } = parseHomeVehicleParams(sp);

  const sliderMaxPromise = getCatalogSliderMax();
  const [cats, prods, vehicleFilterData, kitsData, kitCategorias, descontosPadrao, sliderMax] = await Promise.all([
    getHomeCategories(),
    getHomeProducts({ q: searchQ, modeloId, anoVeiculo }),
    getVehicleFilterCatalogData({ modeloIdForAnos: modeloId }),
    searchQ ? searchPublishedKits(searchQ) : Promise.resolve([]),
    searchQ ? Promise.resolve([]) : getKitCategorias(),
    getDescontosPadrao(createPublicClient()),
    sliderMaxPromise,
  ]);

  if (!searchQ) {
    const filtrosKit = normalizeCatalogFilters(
      {
        q: "kit filtros",
        categoriaIds: [],
        marcaIds: [],
        precoMin: null,
        precoMax: null,
        modeloId: null,
        ano: null,
      },
      sliderMax,
    );
    const [catalogKitsFiltro, suspensaoKits] = await Promise.all([
      getCatalogProducts(filtrosKit, sliderMax, 1, 8),
      getPublishedKits("suspensao"),
    ]);
    kitsFiltroExemplo = catalogKitsFiltro.produtos;
    kitsSuspensaoExemplo = suspensaoKits.slice(0, 8);
  }
  const suspensao = kitCategorias.find((c) => c.slug === "suspensao");
  categorias = cats;
  produtosVitrine = prods.vitrine;
  kits = kitsData;

  const vehicleFiltering = Boolean(modeloId);
  /** Com busca ou veículo, produtos ficam logo abaixo da área de pesquisa/filtros (categorias depois). */
  const catalogActive = Boolean(searchQ) || vehicleFiltering;
  const emptyVitrine =
    searchQ && vehicleFiltering
      ? "Nenhum produto combina a busca com o veículo escolhido. Ajuste o texto, o modelo ou o ano."
      : searchQ
        ? "Nenhum produto corresponde à busca. Tente outro termo ou limpe o campo de pesquisa."
        : vehicleFiltering
          ? "Nenhum produto compatível com o veículo escolhido. Tente outro modelo ou ano."
          : undefined;

  const kitsBlock = searchQ ? (
    <KitsSection
      kits={kits}
      title="Kits encontrados"
      emptyMessage="Nenhum kit corresponde à busca."
      categorias={kitCategorias}
      descontoPadrao={descontosPadrao}
    />
  ) : null;

  const catalogMain = (
    <main className="flex min-h-0 flex-1 flex-col">
      {kitsBlock}
      {!searchQ ? (
        <CombosExemploHomeSection
          kitsFiltro={kitsFiltroExemplo}
          kitsSuspensao={kitsSuspensaoExemplo}
          descontoPadrao={descontosPadrao}
        />
      ) : null}
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
          <section className={`border-b border-store-line/50 bg-store-cream py-6 sm:py-8 ${storeShellInset}`}>
            <div className={storeShellContent}>
              <CategoriesSection categorias={categorias} />
            </div>
          </section>
          <HomeBeneficiosFaixa />
        </>
      ) : (
        <>
          <section className={`border-b border-store-line/50 bg-store-cream pt-4 pb-6 sm:pt-5 sm:pb-8 ${storeShellInset}`}>
            <div className={storeShellContent}>
              <CategoriesSection categorias={categorias} />
            </div>
          </section>
          <HomeBeneficiosFaixa />
          <section className={`bg-store-cream pt-4 sm:pt-5 ${storeShellInset}`}>
            <div className={storeShellContent}>
              <KitsDestaqueCards
                suspensaoHref={suspensao ? `/kits?categoria=${suspensao.slug}` : null}
                descontos={descontosPadrao}
              />
            </div>
          </section>

          {catalogMain}
        </>
      )}

      <SiteFooter />
    </div>
  );
}
