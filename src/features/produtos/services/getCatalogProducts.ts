import { cache } from "react";
import { unstable_cache } from "next/cache";

import {
  fetchProductIdsCompatComMarcas,
  fetchProductIdsMatchingSearchTerm,
} from "@/features/produtos/services/productSearchMatchingIds";
import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import type { CatalogFilters } from "@/features/produtos/utils/catalogSearchParams";
import {
  mapProductSummaryRow,
  PRODUCT_SUMMARY_SELECT,
  type ProductSummaryRow,
} from "@/features/produtos/utils/mapProductSummaryRow";
import { PRODUCT_STATUS_PUBLISHED } from "@/features/produtos/utils/productStatus";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";
import type { ProductSummary } from "@/types/product";

export const CATALOG_PAGE_SIZE = 24;

export type CatalogProductsPage = {
  produtos: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function mapRows(rows: ProductSummaryRow[]): ProductSummary[] {
  return rows.map((row) => mapProductSummaryRow(row));
}

function intersect(a: string[], bSet: Set<string>): string[] {
  return a.filter((id) => bSet.has(id));
}

type AnySupabase = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createPublicClient>;

async function fetchCompatTodosModelosIds(supabase: AnySupabase): Promise<string[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("id")
    .eq("status", PRODUCT_STATUS_PUBLISHED)
    .eq("compat_todos_modelos", true);
  if (error || !data?.length) return [];
  return data.map((r) => r.id as string).filter(Boolean);
}

async function resolveCandidateIds(
  supabase: AnySupabase,
  filters: CatalogFilters
): Promise<string[] | undefined | null> {
  let candidateIds: string[] | undefined;

  if (filters.categoriaIds.length > 0) {
    const { data, error } = await supabase
      .from("produto_categorias")
      .select("produto_id")
      .in("categoria_id", filters.categoriaIds);
    if (error || !data?.length) return null;
    candidateIds = [...new Set(data.map((r) => r.produto_id as string))];
  }

  if (filters.marcaIds.length > 0) {
    const [compIds, todosModelosIds] = await Promise.all([
      fetchProductIdsCompatComMarcas(supabase, filters.marcaIds),
      fetchCompatTodosModelosIds(supabase),
    ]);
    const marcaSet = new Set(compIds);
    for (const pid of todosModelosIds) marcaSet.add(pid);
    if (marcaSet.size === 0) return null;
    candidateIds = candidateIds ? intersect(candidateIds, marcaSet) : [...marcaSet];
    if (candidateIds.length === 0) return null;
  }

  if (filters.modeloId) {
    let compQuery = supabase
      .from("produto_compatibilidades")
      .select("produto_id")
      .eq("modelo_id", filters.modeloId);
    if (filters.ano != null) {
      compQuery = compQuery.lte("ano_inicio", filters.ano).gte("ano_fim", filters.ano);
    }
    const [{ data: compRows, error: compErr }, todosModelosIds] = await Promise.all([
      compQuery,
      fetchCompatTodosModelosIds(supabase),
    ]);
    if (compErr) return null;
    const modelSet = new Set((compRows ?? []).map((r) => r.produto_id as string));
    for (const pid of todosModelosIds) modelSet.add(pid);
    if (modelSet.size === 0) return null;
    candidateIds = candidateIds ? intersect(candidateIds, modelSet) : [...modelSet];
    if (candidateIds.length === 0) return null;
  }

  const rawSearch = filters.q?.trim();
  if (rawSearch) {
    const searchIds = await fetchProductIdsMatchingSearchTerm(supabase, rawSearch);
    if (searchIds.length === 0) return null;
    const searchSet = new Set(searchIds);
    candidateIds = candidateIds ? intersect(candidateIds, searchSet) : [...searchSet];
    if (candidateIds.length === 0) return null;
  }

  return candidateIds;
}

function emptyPage(page: number, pageSize: number): CatalogProductsPage {
  return { produtos: [], total: 0, page, pageSize, totalPages: 0 };
}

async function fetchCatalogProductsPage(
  filters: CatalogFilters,
  sliderMax: number,
  page: number,
  pageSize: number,
  usePublicClient: boolean
): Promise<CatalogProductsPage> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, Math.min(pageSize, 100));

  try {
    const supabase = usePublicClient ? createPublicClient() : await createClient();
    const candidateIds = await resolveCandidateIds(supabase, filters);
    if (candidateIds === null) return emptyPage(safePage, safeSize);

    let produtosQuery = supabase
      .from("produtos")
      .select(PRODUCT_SUMMARY_SELECT, { count: "exact" })
      .eq("status", PRODUCT_STATUS_PUBLISHED)
      .order("titulo");
    if (candidateIds) produtosQuery = produtosQuery.in("id", candidateIds);
    if (filters.precoMin != null && filters.precoMin > 0) {
      produtosQuery = produtosQuery.gte("valor", filters.precoMin);
    }
    if (filters.precoMax != null && filters.precoMax < sliderMax) {
      produtosQuery = produtosQuery.lte("valor", filters.precoMax);
    }

    const from = (safePage - 1) * safeSize;
    const to = from + safeSize - 1;
    const { data, error, count } = await produtosQuery.range(from, to);
    if (error || !data) return emptyPage(safePage, safeSize);

    const total = count ?? data.length;
    const totalPages = total > 0 ? Math.ceil(total / safeSize) : 0;
    return {
      produtos: mapRows(data as ProductSummaryRow[]),
      total,
      page: safePage,
      pageSize: safeSize,
      totalPages,
    };
  } catch {
    return emptyPage(safePage, safeSize);
  }
}

function filtersCacheKey(filters: CatalogFilters): string {
  return JSON.stringify({
    q: filters.q,
    categoriaIds: [...filters.categoriaIds].sort(),
    marcaIds: [...filters.marcaIds].sort(),
    precoMin: filters.precoMin,
    precoMax: filters.precoMax,
    modeloId: filters.modeloId,
    ano: filters.ano,
  });
}

/**
 * Lista produtos do catálogo com filtros e paginação.
 * Marca usa `marcas` + `modelos` + `produto_compatibilidades` (marca do veículo compatível).
 */
export async function getCatalogProducts(
  filters: CatalogFilters,
  sliderMax: number,
  page = 1,
  pageSize = CATALOG_PAGE_SIZE
): Promise<CatalogProductsPage> {
  const key = filtersCacheKey(filters);
  const cached = unstable_cache(
    async () => fetchCatalogProductsPage(filters, sliderMax, page, pageSize, true),
    ["catalog-products", key, String(sliderMax), String(page), String(pageSize)],
    { tags: [CATALOG_CACHE_TAGS.catalogProducts], revalidate: 60 }
  );
  return cached();
}

async function fetchCatalogSliderMax(): Promise<number> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("produtos")
      .select("valor")
      .eq("status", PRODUCT_STATUS_PUBLISHED)
      .order("valor", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || data == null || data.valor == null) return 1000;
    const v = Number(data.valor);
    if (!Number.isFinite(v) || v <= 0) return 1000;
    return Math.max(100, Math.ceil(v / 50) * 50);
  } catch {
    return 1000;
  }
}

const getCachedCatalogSliderMax = unstable_cache(
  fetchCatalogSliderMax,
  ["catalog-slider-max"],
  { tags: [CATALOG_CACHE_TAGS.sliderMax], revalidate: 120 }
);

/** Teto da faixa de preço (slider), em reais, com valor mínimo útil quando não há produtos. */
export const getCatalogSliderMax = cache(async function getCatalogSliderMax(): Promise<number> {
  return getCachedCatalogSliderMax();
});
