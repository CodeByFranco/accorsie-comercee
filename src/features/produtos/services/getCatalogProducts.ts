import { createClient } from "@/services/supabase/server";
import { fetchProductIdsMatchingSearchTerm } from "@/features/produtos/services/productSearchMatchingIds";
import type { CatalogFilters } from "@/features/produtos/utils/catalogSearchParams";
import {
  mapProductSummaryRow,
  PRODUCT_SUMMARY_SELECT,
  type ProductSummaryRow,
} from "@/features/produtos/utils/mapProductSummaryRow";
import type { ProductSummary } from "@/types/product";

function mapRows(rows: ProductSummaryRow[]): ProductSummary[] {
  return rows.map((row) => mapProductSummaryRow(row));
}

function intersect(a: string[], bSet: Set<string>): string[] {
  return a.filter((id) => bSet.has(id));
}

async function fetchCompatTodosModelosIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
  const { data, error } = await supabase.from("produtos").select("id").eq("compat_todos_modelos", true);
  if (error || !data?.length) return [];
  return data.map((r) => r.id as string).filter(Boolean);
}

/** Teto da faixa de preço (slider), em reais, com valor mínimo útil quando não há produtos. */
export async function getCatalogSliderMax(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("produtos")
      .select("valor")
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

/**
 * Lista produtos do catálogo com filtros opcionais.
 * Marca usa `marcas` + `modelos` + `produto_compatibilidades` (marca do veículo compatível).
 */
export async function getCatalogProducts(
  filters: CatalogFilters,
  sliderMax: number
): Promise<ProductSummary[]> {
  try {
    const supabase = await createClient();
    let candidateIds: string[] | undefined;

    if (filters.categoriaIds.length > 0) {
      const { data, error } = await supabase
        .from("produto_categorias")
        .select("produto_id")
        .in("categoria_id", filters.categoriaIds);
      if (error || !data?.length) return [];
      const set = new Set(data.map((r) => r.produto_id as string));
      candidateIds = [...set];
    }

    if (filters.marcaIds.length > 0) {
      const { data: modelosRows, error: modErr } = await supabase
        .from("modelos")
        .select("id")
        .in("marca_id", filters.marcaIds);
      if (modErr || !modelosRows?.length) return [];
      const modeloIds = modelosRows.map((r) => r.id as string);
      const { data: compRows, error: compErr } = await supabase
        .from("produto_compatibilidades")
        .select("produto_id")
        .in("modelo_id", modeloIds);
      if (compErr) return [];
      const marcaSet = new Set((compRows ?? []).map((r) => r.produto_id as string));
      const todosModelosIds = await fetchCompatTodosModelosIds(supabase);
      for (const pid of todosModelosIds) marcaSet.add(pid);
      if (marcaSet.size === 0) return [];
      if (candidateIds) {
        candidateIds = intersect(candidateIds, marcaSet);
        if (candidateIds.length === 0) return [];
      } else {
        candidateIds = [...marcaSet];
      }
    }

    if (filters.modeloId) {
      let compQuery = supabase
        .from("produto_compatibilidades")
        .select("produto_id")
        .eq("modelo_id", filters.modeloId);
      if (filters.ano != null) {
        compQuery = compQuery.lte("ano_inicio", filters.ano).gte("ano_fim", filters.ano);
      }
      const { data: compRows, error: compErr } = await compQuery;
      if (compErr) return [];
      const modelSet = new Set((compRows ?? []).map((r) => r.produto_id as string));
      const todosModelosIds = await fetchCompatTodosModelosIds(supabase);
      for (const pid of todosModelosIds) modelSet.add(pid);
      if (modelSet.size === 0) return [];
      if (candidateIds) {
        candidateIds = intersect(candidateIds, modelSet);
        if (candidateIds.length === 0) return [];
      } else {
        candidateIds = [...modelSet];
      }
    }

    const rawSearch = filters.q?.trim();
    if (rawSearch) {
      const searchIds = await fetchProductIdsMatchingSearchTerm(supabase, rawSearch);
      if (searchIds.length === 0) return [];
      const searchSet = new Set(searchIds);
      if (candidateIds) {
        candidateIds = intersect(candidateIds, searchSet);
        if (candidateIds.length === 0) return [];
      } else {
        candidateIds = [...searchSet];
      }
    }

    let produtosQuery = supabase
      .from("produtos")
      .select(PRODUCT_SUMMARY_SELECT)
      .order("titulo");
    if (candidateIds) produtosQuery = produtosQuery.in("id", candidateIds);
    if (filters.precoMin != null && filters.precoMin > 0) produtosQuery = produtosQuery.gte("valor", filters.precoMin);
    if (filters.precoMax != null && filters.precoMax < sliderMax) {
      produtosQuery = produtosQuery.lte("valor", filters.precoMax);
    }

    const { data, error } = await produtosQuery;
    if (error || !data) return [];
    return mapRows(data as ProductSummaryRow[]);
  } catch {
    return [];
  }
}
