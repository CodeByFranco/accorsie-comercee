import { createClient } from "@/services/supabase/server";
import { fetchProductIdsMatchingSearchTerm } from "@/features/produtos/services/productSearchMatchingIds";
import {
  mapProductSummaryRow,
  PRODUCT_SUMMARY_SELECT,
  type ProductSummaryRow,
} from "@/features/produtos/utils/mapProductSummaryRow";
import type { ProductSummary } from "@/types/product";

function intersectIds(a: string[], bSet: Set<string>): string[] {
  return a.filter((id) => bSet.has(id));
}

async function fetchCompatTodosModelosIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
  const { data, error } = await supabase.from("produtos").select("id").eq("compat_todos_modelos", true);
  if (error || !data?.length) return [];
  return data.map((r) => r.id as string).filter(Boolean);
}

function mapRows(rows: ProductSummaryRow[]): ProductSummary[] {
  return rows.map((row) => mapProductSummaryRow(row));
}

export async function getHomeProducts(opts?: {
  q?: string | null;
  modeloId?: string | null;
  anoVeiculo?: number | null;
}): Promise<{
  destaque: ProductSummary[];
  vitrine: ProductSummary[];
}> {
  try {
    const supabase = await createClient();
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
      const { data: compRows, error: compErr } = await compQuery;
      if (compErr) return { destaque: [], vitrine: [] };
      const ids = new Set((compRows ?? []).map((r) => r.produto_id as string).filter(Boolean));
      const todosModelosIds = await fetchCompatTodosModelosIds(supabase);
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
      .eq("em_destaque", true)
      .order("titulo")
      .limit(15);
    if (filterIds) destQuery = destQuery.in("id", filterIds);

    const destRes = await destQuery;
    const destaque = !destRes.error && destRes.data ? mapRows(destRes.data as ProductSummaryRow[]) : [];
    const destIds = destaque.map((p) => p.id);

    let vitQuery = supabase
      .from("produtos")
      .select(PRODUCT_SUMMARY_SELECT)
      .order("titulo")
      .limit(10);
    if (filterIds) vitQuery = vitQuery.in("id", filterIds);
    if (destIds.length > 0) {
      vitQuery = vitQuery.not(
        "id",
        "in",
        `(${destIds.map((id) => `"${id}"`).join(",")})`,
      );
    }

    const prodRes = await vitQuery;

    return {
      destaque,
      vitrine: !prodRes.error && prodRes.data ? mapRows(prodRes.data as ProductSummaryRow[]) : [],
    };
  } catch {
    return { destaque: [], vitrine: [] };
  }
}
