import { cache } from "react";
import { unstable_cache } from "next/cache";

import { fetchProductIdsMatchingSearchTerm } from "@/features/produtos/services/productSearchMatchingIds";
import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import {
  mapProductSummaryRow,
  PRODUCT_SUMMARY_SELECT,
  type ProductSummaryRow,
} from "@/features/produtos/utils/mapProductSummaryRow";
import { PRODUCT_STATUS_PUBLISHED } from "@/features/produtos/utils/productStatus";
import { createPublicClient } from "@/services/supabase/public";
import type { ProductSummary } from "@/types/product";

function intersectIds(a: string[], bSet: Set<string>): string[] {
  return a.filter((id) => bSet.has(id));
}

async function fetchCompatTodosModelosIds(
  supabase: ReturnType<typeof createPublicClient>
): Promise<string[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("id")
    .eq("status", PRODUCT_STATUS_PUBLISHED)
    .eq("compat_todos_modelos", true);
  if (error || !data?.length) return [];
  return data.map((r) => r.id as string).filter(Boolean);
}

function mapRows(rows: ProductSummaryRow[]): ProductSummary[] {
  return rows.map((row) => mapProductSummaryRow(row));
}

async function fetchHomeProducts(opts?: {
  q?: string | null;
  modeloId?: string | null;
  anoVeiculo?: number | null;
}): Promise<{
  destaque: ProductSummary[];
  vitrine: ProductSummary[];
}> {
  try {
    const supabase = createPublicClient();
    const rawSearch = opts?.q?.trim();
    let searchIds: string[] | null = null;
    if (rawSearch) {
      const ids = await fetchProductIdsMatchingSearchTerm(supabase, rawSearch);
      if (ids.length === 0) return { destaque: [], vitrine: [] };
      searchIds = ids;
    }

    const modeloId = opts?.modeloId?.trim() || null;
    let vehicleIds: string[] | null = null;
    if (modeloId) {
      let compQuery = supabase.from("produto_compatibilidades").select("produto_id").eq("modelo_id", modeloId);
      const ano = opts?.anoVeiculo;
      if (ano != null && Number.isFinite(ano)) {
        compQuery = compQuery.lte("ano_inicio", ano).gte("ano_fim", ano);
      }
      const [{ data: compRows, error: compErr }, todosModelosIds] = await Promise.all([
        compQuery,
        fetchCompatTodosModelosIds(supabase),
      ]);
      if (compErr) return { destaque: [], vitrine: [] };
      const ids = new Set((compRows ?? []).map((r) => r.produto_id as string).filter(Boolean));
      for (const pid of todosModelosIds) ids.add(pid);
      if (ids.size === 0) return { destaque: [], vitrine: [] };
      vehicleIds = [...ids];
    }

    let filterIds: string[] | null = null;
    if (searchIds && vehicleIds) {
      filterIds = intersectIds(searchIds, new Set(vehicleIds));
      if (filterIds.length === 0) return { destaque: [], vitrine: [] };
    } else if (searchIds) {
      filterIds = searchIds;
    } else if (vehicleIds) {
      filterIds = vehicleIds;
    }

    let destQuery = supabase
      .from("produtos")
      .select(PRODUCT_SUMMARY_SELECT)
      .eq("status", PRODUCT_STATUS_PUBLISHED)
      .eq("em_destaque", true)
      .order("titulo")
      .limit(15);
    if (filterIds) destQuery = destQuery.in("id", filterIds);

    // Busca vitrine em paralelo (limite maior) e remove destaques depois — mesmo resultado, menos latência.
    let vitQuery = supabase
      .from("produtos")
      .select(PRODUCT_SUMMARY_SELECT)
      .eq("status", PRODUCT_STATUS_PUBLISHED)
      .order("titulo")
      .limit(25);
    if (filterIds) vitQuery = vitQuery.in("id", filterIds);

    const [destRes, vitRes] = await Promise.all([destQuery, vitQuery]);
    const destaque = !destRes.error && destRes.data ? mapRows(destRes.data as ProductSummaryRow[]) : [];
    const destIdSet = new Set(destaque.map((p) => p.id));
    const vitrineRaw =
      !vitRes.error && vitRes.data ? mapRows(vitRes.data as ProductSummaryRow[]) : [];
    const vitrine = vitrineRaw.filter((p) => !destIdSet.has(p.id)).slice(0, 10);

    return { destaque, vitrine };
  } catch {
    return { destaque: [], vitrine: [] };
  }
}

export const getHomeProducts = cache(async function getHomeProducts(opts?: {
  q?: string | null;
  modeloId?: string | null;
  anoVeiculo?: number | null;
}): Promise<{
  destaque: ProductSummary[];
  vitrine: ProductSummary[];
}> {
  const key = JSON.stringify({
    q: opts?.q ?? null,
    modeloId: opts?.modeloId ?? null,
    anoVeiculo: opts?.anoVeiculo ?? null,
  });
  return unstable_cache(
    async () => fetchHomeProducts(opts),
    ["home-products", key],
    { tags: [CATALOG_CACHE_TAGS.homeProducts], revalidate: 60 }
  )();
});
