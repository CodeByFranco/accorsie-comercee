"use server";

import {
  mapProductSummaryRow,
  PRODUCT_SUMMARY_SELECT,
  type ProductSummaryRow,
} from "@/features/produtos/utils/mapProductSummaryRow";
import { unitPriceAfterPaymentDiscount } from "@/features/produtos/utils/paymentDiscount";
import { PRODUCT_STATUS_PUBLISHED } from "@/features/produtos/utils/productStatus";
import { createPublicClient } from "@/services/supabase/public";
import type { ProductSummary } from "@/types/product";

const MAX_SUGESTOES = 4;

/** Produtos com preço logo acima do que falta para o frete grátis (os mais próximos primeiro). */
export async function getSugestoesFreteGratis(
  falta: number,
  excluirIds: string[],
): Promise<ProductSummary[]> {
  const alvo = Math.round(Number(falta) * 100) / 100;
  if (!Number.isFinite(alvo) || alvo <= 0) return [];

  const excluir = new Set(excluirIds.map((id) => String(id).trim()).filter(Boolean));

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("produtos")
      .select(PRODUCT_SUMMARY_SELECT)
      .eq("status", PRODUCT_STATUS_PUBLISHED)
      .gt("quantidade_estoque", 0)
      .eq("somente_retirada_loja", false)
      .gte("valor", alvo)
      .order("valor", { ascending: true })
      .limit(100);
    if (error || !data) return [];

    const precoCartao = (p: ProductSummary) =>
      unitPriceAfterPaymentDiscount(p.valor, "cartao", p.desconto_pix_percent, p.desconto_cartao_percent);

    return (data as ProductSummaryRow[])
      .map(mapProductSummaryRow)
      .filter((p) => !excluir.has(p.id) && precoCartao(p) >= alvo)
      .sort((a, b) => precoCartao(a) - precoCartao(b))
      .slice(0, MAX_SUGESTOES);
  } catch {
    return [];
  }
}
