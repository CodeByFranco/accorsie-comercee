import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { parseSiteInstitucional, type SiteInstitucional } from "@/features/site-layout/utils/institucional";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";

/** Se as colunas ainda não existirem (migração pendente), cai nos textos padrão. */
async function queryInstitucional(client: SupabaseClient): Promise<SiteInstitucional> {
  try {
    const { data, error } = await client
      .from("site_layout")
      .select("manifesto_texto, horarios_texto")
      .eq("id", "default")
      .maybeSingle();
    if (error) return parseSiteInstitucional(null);
    return parseSiteInstitucional(data);
  } catch {
    return parseSiteInstitucional(null);
  }
}

const getCached = unstable_cache(
  () => queryInstitucional(createPublicClient()),
  ["store-site-institucional-v1"],
  { tags: [CATALOG_CACHE_TAGS.siteLayout], revalidate: 60 * 60 },
);

/** Vitrine (cache; `saveSiteInstitucional` invalida a tag). */
export const getStoreSiteInstitucional = cache(async () => getCached());

/** Admin: leitura direta. */
export async function getSiteInstitucional(): Promise<SiteInstitucional> {
  return queryInstitucional(await createClient());
}
