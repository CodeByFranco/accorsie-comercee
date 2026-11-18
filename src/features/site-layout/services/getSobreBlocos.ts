import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { defaultSobreBlocos, parseSobreBlocos, type SobreBloco } from "@/features/site-layout/utils/sobreBlocos";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";

export type SobreBlocosResult = { blocos: SobreBloco[]; personalizado: boolean };

/** Sem coluna (migração pendente) ou sem nada salvo → layout padrão. */
async function query(client: SupabaseClient): Promise<SobreBlocosResult> {
  try {
    const { data, error } = await client
      .from("site_layout")
      .select("sobre_blocos, manifesto_texto")
      .eq("id", "default")
      .maybeSingle();
    if (!error) {
      const salvos = parseSobreBlocos(data?.sobre_blocos);
      if (salvos) return { blocos: salvos, personalizado: true };
      return { blocos: defaultSobreBlocos(data?.manifesto_texto), personalizado: false };
    }
  } catch {
    /* cai no padrão */
  }
  try {
    const { data } = await client.from("site_layout").select("manifesto_texto").eq("id", "default").maybeSingle();
    return { blocos: defaultSobreBlocos(data?.manifesto_texto), personalizado: false };
  } catch {
    return { blocos: defaultSobreBlocos(), personalizado: false };
  }
}

const getCached = unstable_cache(() => query(createPublicClient()), ["store-sobre-blocos-v1"], {
  tags: [CATALOG_CACHE_TAGS.siteLayout],
  revalidate: 60 * 60,
});

/** Vitrine (cache; `saveSobreBlocos` invalida a tag). */
export const getStoreSobreBlocos = cache(async () => getCached());

/** Admin: leitura direta. */
export async function getSobreBlocos(): Promise<SobreBlocosResult> {
  return query(await createClient());
}
