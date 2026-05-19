import { createClient } from "@/services/supabase/server";
import { resolveProductImagePublicUrl } from "@/features/produtos/utils/resolveProductImagePublicUrl";
import { clampPercent } from "@/features/produtos/utils/paymentDiscount";
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

type ProdutoSummaryRow = {
  id: string;
  titulo: string;
  cod_produto: string;
  valor: unknown;
  foto: string | null;
  quantidade_estoque: unknown;
  desconto_pix_percent?: unknown;
  desconto_cartao_percent?: unknown;
};

type ProdutoFotoRow = {
  foto: string | null;
  is_principal: boolean | null;
  ordem: number | null;
};

function toStock(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function toSummary(row: ProdutoSummaryRow): ProductSummary {
  return {
    id: row.id,
    titulo: row.titulo,
    cod_produto: row.cod_produto,
    valor: Number(row.valor),
    imageUrl: resolveProductImagePublicUrl(row.foto),
    quantidade_estoque: toStock(row.quantidade_estoque),
    desconto_pix_percent: clampPercent(row.desconto_pix_percent),
    desconto_cartao_percent: clampPercent(row.desconto_cartao_percent),
  };
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
    return ai === af ? `${base} ${ai}` : `${base} ${ai}-${af}`;
  }
  if (Number.isFinite(ai)) return `${base} a partir de ${ai}`;
  if (Number.isFinite(af)) return `${base} até ${af}`;
  return base;
}

async function fetchSummariesInOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
    .select("id, titulo, cod_produto, valor, foto, quantidade_estoque, desconto_pix_percent, desconto_cartao_percent")
    .in("id", unique);
  if (error || !data) return [];
  const byId = new Map((data as ProdutoSummaryRow[]).map((row) => [row.id, toSummary(row)]));
  return unique.map((id) => byId.get(id)).filter((p): p is ProductSummary => p != null);
}

async function fetchSummariesSorted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
  limit: number,
): Promise<ProductSummary[]> {
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0 || limit <= 0) return [];
  const { data, error } = await supabase
    .from("produtos")
    .select("id, titulo, cod_produto, valor, foto, quantidade_estoque, desconto_pix_percent, desconto_cartao_percent")
    .in("id", clean)
    .order("titulo")
    .limit(limit);
  if (error || !data) return [];
  return (data as ProdutoSummaryRow[]).map((row) => toSummary(row));
}

export async function getProductDetailPageData(productId: string): Promise<ProductDetailPageData> {
  try {
    const supabase = await createClient();

    const { data: produtoData, error: produtoError } = await supabase
      .from("produtos")
      .select(
        "id, titulo, cod_produto, valor, foto, quantidade_estoque, descricao, desconto_pix_percent, desconto_cartao_percent, compat_todos_modelos",
      )
      .eq("id", productId)
      .maybeSingle();

    if (produtoError || !produtoData) {
      return { produto: null, relacionados: [] };
    }

    const produtoRow = produtoData as ProdutoBaseRow;
    const produto: ProductDetail = {
      ...toSummary(produtoRow as ProdutoSummaryRow),
      descricao: (produtoRow.descricao ?? "").trim(),
      compatibilidades: [],
      imageUrls: [],
    };

    const { data: fotosRows } = await supabase
      .from("produto_fotos")
      .select("foto, is_principal, ordem")
      .eq("produto_id", productId)
      .order("is_principal", { ascending: false })
      .order("ordem", { ascending: true });

    const galleryFromTable = (fotosRows as ProdutoFotoRow[] | null | undefined)
      ?.map((row) => resolveProductImagePublicUrl(row.foto))
      .filter((url): url is string => Boolean(url));
    const fallbackImage = produto.imageUrl ? [produto.imageUrl] : [];
    produto.imageUrls = galleryFromTable && galleryFromTable.length > 0 ? galleryFromTable : fallbackImage;

    const { data: compatRows } = await supabase
      .from("produto_compatibilidades")
      .select("ano_inicio, ano_fim, modelos ( nome, marcas ( nome ) )")
      .eq("produto_id", productId)
      .order("ano_inicio")
      .limit(24);

    if (produtoRow.compat_todos_modelos) {
      produto.compatibilidades = ["Todos os modelos de veículo"];
    } else {
      const compatLabels = (compatRows ?? [])
        .map((row) => compatibilityLabelFromRow(row))
        .filter((v): v is string => Boolean(v));
      produto.compatibilidades = [...new Set(compatLabels)];
    }

    const modeloIdsRes = await supabase
      .from("produto_compatibilidades")
      .select("modelo_id")
      .eq("produto_id", productId);
    const modeloIds = [...new Set((modeloIdsRes.data ?? []).map((r) => r.modelo_id as string).filter(Boolean))];

    const { data: manualLinks } = await supabase
      .from("produto_relacionados")
      .select("relacionado_id")
      .eq("produto_id", productId);
    const manualIds = [...new Set((manualLinks ?? []).map((r) => r.relacionado_id as string).filter(Boolean))].filter(
      (id) => id !== productId,
    );

    const limit = 4;
    let relacionados: ProductSummary[] = [];

    if (manualIds.length > 0) {
      relacionados = await fetchSummariesInOrder(supabase, manualIds, limit);
    }

    const used = new Set<string>([productId, ...relacionados.map((p) => p.id)]);

    async function fillFromSameModel(need: number): Promise<void> {
      if (need <= 0 || modeloIds.length === 0) return;
      const { data: sameModelRows } = await supabase
        .from("produto_compatibilidades")
        .select("produto_id")
        .in("modelo_id", modeloIds)
        .limit(80);
      const candidates = [
        ...new Set((sameModelRows ?? []).map((r) => r.produto_id as string).filter((id) => id && !used.has(id))),
      ];
      const extra = await fetchSummariesSorted(supabase, candidates, need);
      for (const p of extra) {
        if (used.has(p.id)) continue;
        used.add(p.id);
        relacionados.push(p);
        if (relacionados.length >= limit) break;
      }
    }

    if (relacionados.length < limit) {
      await fillFromSameModel(limit - relacionados.length);
    }

    if (relacionados.length < limit) {
      const { data: categoryLinks } = await supabase
        .from("produto_categorias")
        .select("categoria_id")
        .eq("produto_id", productId);
      const categoryIds = [...new Set((categoryLinks ?? []).map((row) => row.categoria_id as string).filter(Boolean))];

      if (categoryIds.length > 0) {
        const { data: relatedLinks } = await supabase
          .from("produto_categorias")
          .select("produto_id")
          .in("categoria_id", categoryIds)
          .neq("produto_id", productId)
          .limit(24);
        const relatedIds = [
          ...new Set((relatedLinks ?? []).map((row) => row.produto_id as string).filter((id) => !used.has(id))),
        ];
        const extra = await fetchSummariesSorted(supabase, relatedIds, limit - relacionados.length);
        for (const p of extra) {
          if (used.has(p.id)) continue;
          used.add(p.id);
          relacionados.push(p);
          if (relacionados.length >= limit) break;
        }
      }
    }

    if (relacionados.length < limit) {
      const { data: fallbackData } = await supabase
        .from("produtos")
        .select("id, titulo, cod_produto, valor, foto, quantidade_estoque, desconto_pix_percent, desconto_cartao_percent")
        .neq("id", productId)
        .order("titulo")
        .limit(24);
      const rest = (fallbackData ?? [])
        .map((row) => toSummary(row as ProdutoSummaryRow))
        .filter((p) => !used.has(p.id))
        .slice(0, limit - relacionados.length);
      relacionados = [...relacionados, ...rest];
    }

    return { produto, relacionados };
  } catch {
    return { produto: null, relacionados: [] };
  }
}
