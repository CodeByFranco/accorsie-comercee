import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";
import { querySiteLayout } from "@/features/site-layout/services/querySiteLayout";
import { emptySiteLayoutRow } from "@/features/site-layout/utils/homeBannerUrls";
import type { SiteLayoutRow } from "@/types/siteLayout";

const EMPTY = emptySiteLayoutRow();

/** Lança em falha: `unstable_cache` não grava erro, então a próxima visita tenta de novo. */
async function fetchStoreSiteLayout(): Promise<SiteLayoutRow> {
  return querySiteLayout(createPublicClient(), { strict: true });
}

const getCachedStoreSiteLayout = unstable_cache(fetchStoreSiteLayout, ["store-site-layout-v4"], {
  tags: [CATALOG_CACHE_TAGS.siteLayout],
  revalidate: 60 * 60,
});

/** Banners da vitrine (cache sem cookies; `saveSiteLayout` invalida a tag). */
export const getStoreSiteLayout = cache(async function getStoreSiteLayout(): Promise<SiteLayoutRow> {
  try {
    return await getCachedStoreSiteLayout();
  } catch (e) {
    console.error("getStoreSiteLayout:", e instanceof Error ? e.message : e);
    return EMPTY;
  }
});

/** Leitura direta (admin): sempre o valor atual. */
export async function getSiteLayout(): Promise<SiteLayoutRow> {
  try {
    const supabase = await createClient();
    return await querySiteLayout(supabase);
  } catch {
    return EMPTY;
  }
}
