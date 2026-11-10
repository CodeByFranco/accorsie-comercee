import type { MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";

/** Precisa bater com o mínimo validado em `criar_pedido_checkout` (migration frete_gratis_minimo). */
export const FRETE_GRATIS_MINIMO = 199;

/** Valor dos produtos já com descontos (kit e cupom), sem o frete. */
export function atingeFreteGratis(valorProdutos: number): boolean {
  return Math.round(valorProdutos * 100) >= FRETE_GRATIS_MINIMO * 100;
}

export function faltaParaFreteGratis(valorProdutos: number): number {
  return Math.max(0, Math.round((FRETE_GRATIS_MINIMO - valorProdutos) * 100) / 100);
}

/** Só a opção mais barata da cotação entra no frete grátis. */
export function opcaoFreteGratisId(opcoes: MelhorEnvioQuoteOption[]): string | null {
  if (opcoes.length === 0) return null;
  return [...opcoes].sort((a, b) => a.precoCentavos - b.precoCentavos)[0]?.id ?? null;
}
