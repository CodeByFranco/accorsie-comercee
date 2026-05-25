import { resolveProductImagePublicUrl } from "@/features/produtos/utils/resolveProductImagePublicUrl";
import { clampPercent } from "@/features/produtos/utils/paymentDiscount";
import type { ProductSummary } from "@/types/product";

export type ProductSummaryRow = {
  id: string;
  titulo: string;
  cod_produto: string;
  valor: unknown;
  foto: string | null;
  quantidade_estoque: unknown;
  desconto_pix_percent?: unknown;
  desconto_cartao_percent?: unknown;
  somente_retirada_loja?: unknown;
};

export const PRODUCT_SUMMARY_SELECT =
  "id, titulo, cod_produto, valor, foto, quantidade_estoque, desconto_pix_percent, desconto_cartao_percent, somente_retirada_loja" as const;

export function mapProductSummaryRow(row: ProductSummaryRow): ProductSummary {
  const q = Number(row.quantidade_estoque);
  return {
    id: row.id,
    titulo: row.titulo,
    cod_produto: row.cod_produto,
    valor: Number(row.valor),
    imageUrl: resolveProductImagePublicUrl(row.foto),
    quantidade_estoque: Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0,
    desconto_pix_percent: clampPercent(row.desconto_pix_percent),
    desconto_cartao_percent: clampPercent(row.desconto_cartao_percent),
    somente_retirada_loja: row.somente_retirada_loja === true,
  };
}

export function cartRequiresSomenteRetirada(lines: Pick<ProductSummary, "somente_retirada_loja">[]): boolean {
  return lines.some((l) => l.somente_retirada_loja === true);
}
