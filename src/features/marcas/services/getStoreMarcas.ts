import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createPublicClient } from "@/services/supabase/public";

export type StoreMarcaOption = {
  id: string;
  nome: string;
};

async function fetchStoreMarcas(): Promise<StoreMarcaOption[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.from("marcas").select("id, nome").order("nome");
    if (error || !data) return [];
    return data as StoreMarcaOption[];
  } catch {
    return [];
  }
}

const getCachedStoreMarcas = unstable_cache(fetchStoreMarcas, ["store-marcas"], {
  tags: [CATALOG_CACHE_TAGS.vehicleFilter],
  revalidate: 60 * 60,
});

export const getStoreMarcas = cache(async function getStoreMarcas(): Promise<StoreMarcaOption[]> {
  return getCachedStoreMarcas();
});
