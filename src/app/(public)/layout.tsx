import type { ReactNode } from "react";

import { StoreNavbar } from "@/components/layout/StoreNavbar";
import { WhatsAppAssistantButton } from "@/components/layout/WhatsAppAssistantButton";
import { CartProvider } from "@/features/carrinho/CartContext";
import { getHomeCategories } from "@/features/categorias/services/getHomeCategories";
import { getStoreSiteLayout } from "@/features/site-layout/services/getSiteLayout";
import { getKitCategorias } from "@/features/kits/services/getHomeKits";
import { getCatalogSliderMax } from "@/features/produtos/services/getCatalogProducts";

const FALLBACK_HOME_BANNER = "/home/Banner%20inicial.png";

/**
 * Layout da vitrine: só dados públicos em cache (sem cookies). Conta/garagem/link do painel
 * são lidos no navegador pela navbar (`useStoreAccount`).
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [categorias, catalogSliderMax, siteLayout, kitCategorias] = await Promise.all([
    getHomeCategories(),
    getCatalogSliderMax(),
    getStoreSiteLayout(),
    getKitCategorias(),
  ]);

  const fromDb = [siteLayout.banner_1_url, siteLayout.banner_2_url]
    .map((s) => s.trim())
    .filter(Boolean);
  const homeBannerSrcs = fromDb.length > 0 ? fromDb : [FALLBACK_HOME_BANNER];

  return (
    <CartProvider>
      <StoreNavbar
        categorias={categorias}
        kitCategorias={kitCategorias}
        catalogSliderMax={catalogSliderMax}
        homeBannerSrcs={homeBannerSrcs}
      />
      {children}
      <WhatsAppAssistantButton />
    </CartProvider>
  );
}
