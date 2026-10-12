import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";
import { resolveProductImagePublicUrl } from "@/features/produtos/utils/resolveProductImagePublicUrl";
import {
  mapProductSummaryRow,
  PRODUCT_SUMMARY_SELECT,
  type ProductSummaryRow,
} from "@/features/produtos/utils/mapProductSummaryRow";
import { PRODUCT_STATUS_PUBLISHED } from "@/features/produtos/utils/productStatus";
import { formatAnoRangeLabel } from "@/features/produtos/utils/wegaText";
import type { ProductSummary } from "@/types/product";

type ProductDetail = ProductSummary & {
  descricao: string;
  compatibilidades: string[];
  imageUrls: string[];
};

type ProductDetailPageData = {
  produto: ProductDetail | null;
  relacionados: ProductSummary[];
};

type ProdutoBaseRow = {
  id: string;
  titulo: string;
  cod_produto: string;
  valor: unknown;
  foto: string | null;
  quantidade_estoque: unknown;
  descricao: string | null;
  desconto_pix_percent?: unknown;
  desconto_cartao_percent?: unknown;
  compat_todos_modelos?: boolean | null;
};

type ProdutoFotoRow = {
  foto: string | null;
  is_principal: boolean | null;
  ordem: number | null;
};

function toSummary(row: ProductSummaryRow): ProductSummary {
  return mapProductSummaryRow(row);
}

function compatibilityLabelFromRow(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as {
    ano_inicio?: number | null;
    ano_fim?: number | null;
    modelos?:
      | { nome?: string | null; marcas?: { nome?: string | null } | Array<{ nome?: string | null }> | null }
      | Array<{ nome?: string | null; marcas?: { nome?: string | null } | Array<{ nome?: string | null }> | null }>
      | null;
  };
  const modeloRaw = Array.isArray(row.modelos) ? row.modelos[0] : row.modelos;
  const modeloNome = (modeloRaw?.nome ?? "").trim();
  const marcaRaw = Array.isArray(modeloRaw?.marcas) ? modeloRaw?.marcas[0] : modeloRaw?.marcas;
  const marcaNome = (marcaRaw?.nome ?? "").trim();
  const base = [marcaNome, modeloNome].filter(Boolean).join(" ");
  if (!base) return null;

  const ai = Number(row.ano_inicio);
  const af = Number(row.ano_fim);
  if (Number.isFinite(ai) && Number.isFinite(af)) {
    return `${base} ${formatAnoRangeLabel(ai, af)}`;
  }
  if (Number.isFinite(ai)) return `${base} a partir de ${ai}`;
  if (Number.isFinite(af)) return `${base} até ${af}`;
  return base;
}

async function fetchSummariesInOrder(
  supabase: SupabaseClient,
  ids: string[],
  limit: number,
): Promise<ProductSummary[]> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= limit) break;
  }
  if (unique.length === 0) return [];
  const { data, error } = await supabase
    .from("produtos")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", PRODUCT_STATUS_PUBLISHED)
    .in("id", unique);
  if (error || !data) return [];
  const byId = new Map((data as ProductSummaryRow[]).map((row) => [row.id, toSummary(row)]));
  return unique.map((id) => byId.get(id)).filter((p): p is ProductSummary => p != null);
}

async function fetchSummariesSorted(
  supabase: SupabaseClient,
  ids: string[],
  limit: number,
): Promise<ProductSummary[]> {
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0 || limit <= 0) return [];
  const { data, error } = await supabase
    .from("produtos")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", PRODUCT_STATUS_PUBLISHED)
    .in("id", clean)
    .order("titulo")
    .limit(limit);
  if (error || !data) return [];
  return (data as ProductSummaryRow[]).map((row) => toSummary(row));
}

const RELACIONADOS_LIMIT = 4;
/** Linhas de compatibilidade exibidas na página (as demais só alimentam os relacionados). */
const COMPAT_LABELS_LIMIT = 24;

type ProdutoIdRow = { produto_id: unknown };

/**
 * Monta a página do produto em no máximo 3 rodadas de consultas paralelas (antes eram até
 * ~11 em sequência). Prioridade dos relacionados: manuais → mesmo modelo de veículo →
 * mesma categoria → demais produtos por título.
 */
async function fetchProductDetailPageData(
  supabase: SupabaseClient,
  productId: string,
  includeUnpublished: boolean,
): Promise<ProductDetailPageData> {
  try {
    let produtoQuery = supabase
      .from("produtos")
      .select(
        `id, titulo, cod_produto, valor, foto, quantidade_estoque, descricao, desconto_pix_percent, desconto_cartao_percent, somente_retirada_loja, compat_todos_modelos`,
      )
      .eq("id", productId);
    if (!includeUnpublished) {
      produtoQuery = produtoQuery.eq("status", PRODUCT_STATUS_PUBLISHED);
    }

    // Rodada 1: produto e tudo que depende só do id.
    const [produtoRes, fotosRes, compatRes, manualRes, categoryRes] = await Promise.all([
      produtoQuery.maybeSingle(),
      supabase
        .from("produto_fotos")
        .select("foto, is_principal, ordem")
        .eq("produto_id", productId)
        .order("is_principal", { ascending: false })
        .order("ordem", { ascending: true }),
      supabase
        .from("produto_compatibilidades")
        .select("modelo_id, ano_inicio, ano_fim, modelos ( nome, marcas ( nome ) )")
        .eq("produto_id", productId)
        .order("ano_inicio"),
      supabase.from("produto_relacionados").select("relacionado_id").eq("produto_id", productId),
      supabase.from("produto_categorias").select("categoria_id").eq("produto_id", productId),
    ]);

    if (produtoRes.error || !produtoRes.data) {
      return { produto: null, relacionados: [] };
    }

    const produtoRow = produtoRes.data as ProdutoBaseRow;
    const produto: ProductDetail = {
      ...toSummary(produtoRow as ProductSummaryRow),
      descricao: (produtoRow.descricao ?? "").trim(),
      compatibilidades: [],
      imageUrls: [],
    };

    const galleryFromTable = (fotosRes.data as ProdutoFotoRow[] | null | undefined)
      ?.map((row) => resolveProductImagePublicUrl(row.foto))
      .filter((url): url is string => Boolean(url));
    const fallbackImage = produto.imageUrl ? [produto.imageUrl] : [];
    produto.imageUrls = galleryFromTable && galleryFromTable.length > 0 ? galleryFromTable : fallbackImage;

    const compatRows = compatRes.data ?? [];
    if (produtoRow.compat_todos_modelos) {
      produto.compatibilidades = ["Todos os modelos de veículo"];
    } else {
      const compatLabels = compatRows
        .slice(0, COMPAT_LABELS_LIMIT)
        .map((row) => compatibilityLabelFromRow(row))
        .filter((v): v is string => Boolean(v));
      produto.compatibilidades = [...new Set(compatLabels)];
    }

    const modeloIds = [...new Set(compatRows.map((r) => r.modelo_id as string).filter(Boolean))];
    const manualIds = [
      ...new Set((manualRes.data ?? []).map((r) => r.relacionado_id as string).filter(Boolean)),
    ].filter((id) => id !== productId);
    const categoryIds = [
      ...new Set((categoryRes.data ?? []).map((row) => row.categoria_id as string).filter(Boolean)),
    ];

    const noRows = Promise.resolve({ data: [] as ProdutoIdRow[] });

    // Rodada 2: candidatos de cada fonte de relacionados, em paralelo.
    const [manuais, sameModelRes, relatedLinksRes, fallbackRes] = await Promise.all([
      fetchSummariesInOrder(supabase, manualIds, RELACIONADOS_LIMIT),
      modeloIds.length > 0
        ? supabase.from("produto_compatibilidades").select("produto_id").in("modelo_id", modeloIds).limit(80)
        : noRows,
      categoryIds.length > 0
        ? supabase
            .from("produto_categorias")
            .select("produto_id")
            .in("categoria_id", categoryIds)
            .neq("produto_id", productId)
            .limit(24)
        : noRows,
      supabase
        .from("produtos")
        .select(PRODUCT_SUMMARY_SELECT)
        .eq("status", PRODUCT_STATUS_PUBLISHED)
        .neq("id", productId)
        .order("titulo")
        .limit(24),
    ]);

    const relacionados: ProductSummary[] = [];
    const used = new Set<string>([productId]);
    const push = (lista: ProductSummary[]) => {
      for (const p of lista) {
        if (relacionados.length >= RELACIONADOS_LIMIT) return;
        if (used.has(p.id)) continue;
        used.add(p.id);
        relacionados.push(p);
      }
    };
    push(manuais);

    const candidateIds = (rows: ProdutoIdRow[] | null | undefined) => [
      ...new Set((rows ?? []).map((r) => r.produto_id as string).filter((id) => id && !used.has(id))),
    ];
    const need = RELACIONADOS_LIMIT - relacionados.length;

    // Rodada 3: resumos dos candidatos por modelo e por categoria, em paralelo.
    const [porModelo, porCategoria] = await Promise.all([
      fetchSummariesSorted(supabase, candidateIds(sameModelRes.data), need),
      fetchSummariesSorted(supabase, candidateIds(relatedLinksRes.data), need),
    ]);
    push(porModelo);
    push(porCategoria);
    push((fallbackRes.data ?? []).map((row) => toSummary(row as ProductSummaryRow)));

    return { produto, relacionados };
  } catch {
    return { produto: null, relacionados: [] };
  }
}

/**
 * Página pública: cliente sem cookies + data cache (mutações no admin invalidam a tag).
 * 60s como o catálogo: vendas mudam o estoque sem passar pelo admin.
 */
function getCachedPublishedProductDetail(productId: string): Promise<ProductDetailPageData> {
  return unstable_cache(
    () => fetchProductDetailPageData(createPublicClient(), productId, false),
    ["product-detail", productId],
    { tags: [CATALOG_CACHE_TAGS.catalogProducts], revalidate: 60 },
  )();
}

export const getProductDetailPageData = cache(async function getProductDetailPageData(
  productId: string,
  includeUnpublished = false,
): Promise<ProductDetailPageData> {
  if (!includeUnpublished) return getCachedPublishedProductDetail(productId);
  // Prévia do admin (rascunhos): sessão do usuário, sem cache.
  return fetchProductDetailPageData(await createClient(), productId, true);
});
