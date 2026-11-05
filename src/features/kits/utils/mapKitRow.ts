import { computeKitPricing, parseKitDiscountType } from "@/features/kits/utils/kitPricing";
import { resolveProductImagePublicUrl } from "@/features/produtos/utils/resolveProductImagePublicUrl";
import { clampPercent } from "@/features/produtos/utils/paymentDiscount";
import type {
  KitChoiceItem,
  KitDetail,
  KitDetailItem,
  KitProductInfo,
  KitSummary,
} from "@/types/kit";
import { parseKitStatus } from "@/features/kits/utils/kitStatus";

export type ProdutoEmbed = {
  id: string;
  titulo: string | null;
  cod_produto: string | null;
  valor: number | string | null;
  foto: string | null;
  quantidade_estoque: number | null;
  desconto_pix_percent?: number | null;
  desconto_cartao_percent?: number | null;
  somente_retirada_loja?: boolean | null;
  status?: string | null;
};

type OpcaoEmbed = {
  product_id: string;
  produtos?: ProdutoEmbed | ProdutoEmbed[] | null;
};

type KitItemEmbed = {
  id?: string;
  tipo?: string | null;
  nome?: string | null;
  qtd_min?: number | null;
  qtd_max?: number | null;
  quantidade: number;
  product_id: string | null;
  produtos?: ProdutoEmbed | ProdutoEmbed[] | null;
  kit_item_opcoes?: OpcaoEmbed[] | null;
};

type CategoriaEmbed = { id: string; nome: string | null; slug: string | null };

export type KitRowWithItems = {
  id: string;
  nome: string | null;
  slug: string | null;
  descricao?: string | null;
  imagem: string | null;
  tipo_desconto: string | null;
  valor_desconto: number | string | null;
  preco_final: number | string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: string | null;
  categorias?: CategoriaEmbed | CategoriaEmbed[] | null;
  kit_items?: KitItemEmbed[] | null;
};

function one<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export function mapProduto(raw: ProdutoEmbed | ProdutoEmbed[] | null | undefined): KitProductInfo | null {
  const p = one(raw);
  if (!p?.id) return null;
  if (p.status && p.status !== "published") return null;
  const valor = Number(p.valor);
  if (!Number.isFinite(valor)) return null;
  return {
    product_id: p.id,
    titulo: (p.titulo ?? "").trim() || "Produto",
    cod_produto: (p.cod_produto ?? "").trim() || "—",
    valor,
    imageUrl: resolveProductImagePublicUrl(p.foto),
    quantidade_estoque: Math.max(0, Math.floor(Number(p.quantidade_estoque) || 0)),
    desconto_pix_percent: clampPercent(p.desconto_pix_percent ?? 0),
    desconto_cartao_percent: clampPercent(p.desconto_cartao_percent ?? 0),
    somente_retirada_loja: p.somente_retirada_loja === true,
  };
}

export function mapKitItems(rows: KitItemEmbed[] | null | undefined): KitDetailItem[] {
  const items: KitDetailItem[] = [];
  for (const row of rows ?? []) {
    if ((row.tipo ?? "fixo") !== "fixo") continue;
    const p = mapProduto(row.produtos);
    if (!p) continue;
    items.push({ ...p, quantidade: Math.max(1, Number(row.quantidade) || 1) });
  }
  return items;
}

export function mapKitChoices(rows: KitItemEmbed[] | null | undefined): KitChoiceItem[] {
  const out: KitChoiceItem[] = [];
  for (const row of rows ?? []) {
    if (row.tipo !== "escolha" || !row.id) continue;
    const qtd_min = Math.max(1, Number(row.qtd_min) || 1);
    const qtd_max = Math.max(qtd_min, Number(row.qtd_max) || qtd_min);
    const qtd_padrao = Math.min(qtd_max, Math.max(qtd_min, Number(row.quantidade) || qtd_min));
    const opcoes = (row.kit_item_opcoes ?? [])
      .map((o) => mapProduto(o.produtos))
      .filter((p): p is KitProductInfo => p != null)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    out.push({
      kit_item_id: row.id,
      nome: (row.nome ?? "").trim() || "Escolha",
      qtd_min,
      qtd_max,
      qtd_padrao,
      opcoes,
    });
  }
  return out;
}

/** Linhas de preço do kit: fixos + escolhas (padrão: opção mais barata na quantidade sugerida). */
export function kitPricingLines(
  items: KitDetailItem[],
  escolhas: KitChoiceItem[],
  selecao?: Map<string, { product_id: string; quantidade: number }>,
): Array<{ valor: number; quantidade: number }> {
  const lines = items.map((it) => ({ valor: it.valor, quantidade: it.quantidade }));
  for (const ch of escolhas) {
    const sel = selecao?.get(ch.kit_item_id);
    const opt = sel
      ? ch.opcoes.find((o) => o.product_id === sel.product_id)
      : [...ch.opcoes].sort((a, b) => a.valor - b.valor)[0];
    if (!opt) continue;
    lines.push({ valor: opt.valor, quantidade: sel?.quantidade ?? ch.qtd_padrao });
  }
  return lines;
}

function mapCategoria(row: KitRowWithItems): KitSummary["categoria"] {
  const c = one(row.categorias);
  if (!c?.id || !c.nome || !c.slug) return null;
  return { id: c.id, nome: c.nome, slug: c.slug };
}

export function mapKitSummary(row: KitRowWithItems): KitSummary | null {
  if (!row.slug?.trim() || !row.nome?.trim()) return null;
  const items = mapKitItems(row.kit_items);
  const escolhas = mapKitChoices(row.kit_items);
  // Escolha sem nenhuma opção disponível torna o kit incomprável.
  if (escolhas.some((c) => c.opcoes.length === 0)) return null;
  const pricing = computeKitPricing({
    tipo_desconto: parseKitDiscountType(row.tipo_desconto),
    valor_desconto: Number(row.valor_desconto) || 0,
    preco_final: row.preco_final != null ? Number(row.preco_final) : null,
    items: kitPricingLines(items, escolhas),
  });
  return {
    id: row.id,
    slug: row.slug.trim(),
    nome: row.nome.trim(),
    imagem: row.imagem ? resolveProductImagePublicUrl(row.imagem) : null,
    precoNormal: pricing.precoNormal,
    precoKit: pricing.precoKit,
    economia: pricing.economia,
    itemCount: items.length + escolhas.length,
    temEscolha: escolhas.length > 0,
    categoria: mapCategoria(row),
  };
}

export function mapKitDetail(row: KitRowWithItems): KitDetail | null {
  const summary = mapKitSummary(row);
  if (!summary) return null;
  return {
    ...summary,
    descricao: (row.descricao ?? "").trim(),
    seo_title: row.seo_title ?? null,
    seo_description: row.seo_description ?? null,
    tipo_desconto: parseKitDiscountType(row.tipo_desconto),
    valor_desconto: Number(row.valor_desconto) || 0,
    preco_final: row.preco_final != null ? Number(row.preco_final) : null,
    status: parseKitStatus(row.status),
    items: mapKitItems(row.kit_items),
    escolhas: mapKitChoices(row.kit_items),
    combo: null,
  };
}

export const PRODUTO_FIELDS =
  "id, titulo, cod_produto, valor, foto, quantidade_estoque, desconto_pix_percent, desconto_cartao_percent, somente_retirada_loja, status";

const KIT_ITEMS_EMBED = `
  kit_items (
    id, tipo, nome, qtd_min, qtd_max, quantidade, product_id,
    produtos ( ${PRODUTO_FIELDS} ),
    kit_item_opcoes ( product_id, produtos ( ${PRODUTO_FIELDS} ) )
  )
`;

export const KIT_LIST_SELECT = `
  id, nome, slug, descricao, imagem, tipo_desconto, valor_desconto, preco_final, status,
  categorias ( id, nome, slug ),
  ${KIT_ITEMS_EMBED}
`;

export const KIT_DETAIL_SELECT = `
  id, nome, slug, descricao, imagem, tipo_desconto, valor_desconto, preco_final,
  seo_title, seo_description, status,
  categorias ( id, nome, slug ),
  ${KIT_ITEMS_EMBED}
`;
