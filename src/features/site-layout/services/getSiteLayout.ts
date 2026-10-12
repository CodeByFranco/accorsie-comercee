import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";
import type { SiteLayoutRow } from "@/types/siteLayout";

const EMPTY: SiteLayoutRow = {
  id: "default",
  banner_1_url: "",
  banner_2_url: "",
  updated_at: new Date(0).toISOString(),
};

async function fetchStoreSiteLayout(): Promise<SiteLayoutRow> {
  try {
    const { data, error } = await createPublicClient()
      .from("site_layout")
      .select("id, banner_1_url, banner_2_url, updated_at")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data) return EMPTY;
    return data as SiteLayoutRow;
  } catch {
    return EMPTY;
  }
}

const getCachedStoreSiteLayout = unstable_cache(fetchStoreSiteLayout, ["store-site-layout"], {
  tags: [CATALOG_CACHE_TAGS.siteLayout],
  revalidate: 60 * 60,
});

/** Banners da vitrine (cache sem cookies; `saveSiteLayout` invalida a tag). */
export const getStoreSiteLayout = cache(async function getStoreSiteLayout(): Promise<SiteLayoutRow> {
  return getCachedStoreSiteLayout();
});

/** Leitura direta (admin): sempre o valor atual. */
export async function getSiteLayout(): Promise<SiteLayoutRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_layout")
    .select("id, banner_1_url, banner_2_url, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return EMPTY;
  }

  return data as SiteLayoutRow;
}
