import type { ReactNode } from "react";

import { StoreNavbar } from "@/components/layout/StoreNavbar";
import { WhatsAppAssistantButton } from "@/components/layout/WhatsAppAssistantButton";
import { WelcomeCotacaoModal } from "@/components/layout/WelcomeCotacaoModal";
import { CartProvider } from "@/features/carrinho/CartContext";
import { getHomeCategories } from "@/features/categorias/services/getHomeCategories";
import { homeBannerUrlsFromSiteLayout } from "@/features/site-layout/utils/homeBannerUrls";
import { getStoreSiteLayout } from "@/features/site-layout/services/getSiteLayout";
import { getKitCategorias } from "@/features/kits/services/getHomeKits";
import { getParcelamentoFaixas } from "@/features/financeiro/services/getParcelamentoFaixas";
import { ParcelamentoFaixasProvider } from "@/features/financeiro/components/ParcelamentoFaixasProvider";
import { getCatalogSliderMax } from "@/features/produtos/services/getCatalogProducts";

/**
 * Layout da vitrine: só dados públicos em cache (sem cookies). Conta/garagem/link do painel
 * são lidos no navegador pela navbar (`useStoreAccount`).
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [categorias, catalogSliderMax, siteLayout, kitCategorias, parcelamentoFaixas] = await Promise.all([
    getHomeCategories(),
    getCatalogSliderMax(),
    getStoreSiteLayout(),
    getKitCategorias(),
    getParcelamentoFaixas(),
  ]);

  const homeBannerSrcs = homeBannerUrlsFromSiteLayout(siteLayout);

  return (
    <CartProvider>
      <ParcelamentoFaixasProvider faixas={parcelamentoFaixas}>
        <StoreNavbar
          categorias={categorias}
          kitCategorias={kitCategorias}
          catalogSliderMax={catalogSliderMax}
          homeBannerSrcs={homeBannerSrcs}
        />
        {children}
        <WhatsAppAssistantButton />
        <WelcomeCotacaoModal />
      </ParcelamentoFaixasProvider>
    </CartProvider>
  );
}
