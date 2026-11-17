import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";
import { querySiteLayout } from "@/features/site-layout/services/querySiteLayout";
import { emptySiteLayoutRow } from "@/features/site-layout/utils/homeBannerUrls";
import type { SiteLayoutRow } from "@/types/siteLayout";

const EMPTY = emptySiteLayoutRow();

async function fetchStoreSiteLayout(): Promise<SiteLayoutRow> {
  try {
    return await querySiteLayout(createPublicClient());
  } catch {
    return EMPTY;
  }
}

const getCachedStoreSiteLayout = unstable_cache(fetchStoreSiteLayout, ["store-site-layout-v3"], {
  tags: [CATALOG_CACHE_TAGS.siteLayout],
  revalidate: 60 * 60,
});

/** Banners da vitrine (cache sem cookies; `saveSiteLayout` invalida a tag). */
export const getStoreSiteLayout = cache(async function getStoreSiteLayout(): Promise<SiteLayoutRow> {
  return getCachedStoreSiteLayout();
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
