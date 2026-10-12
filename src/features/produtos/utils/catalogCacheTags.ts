import { revalidateTag, updateTag } from "next/cache";

/** Tags do data cache da loja (leituras públicas). */
export const CATALOG_CACHE_TAGS = {
  categories: "store-categories",
  sliderMax: "store-catalog-slider-max",
  vehicleFilter: "store-vehicle-filter",
  homeProducts: "store-home-products",
  catalogProducts: "store-catalog-products",
  siteLayout: "store-site-layout",
} as const;

/** Invalida imediatamente o cache de catálogo após mutações no admin. */
export function revalidateStoreCatalogCache(): void {
  for (const tag of Object.values(CATALOG_CACHE_TAGS)) {
    try {
      updateTag(tag);
    } catch {
      revalidateTag(tag, "max");
    }
  }
}
