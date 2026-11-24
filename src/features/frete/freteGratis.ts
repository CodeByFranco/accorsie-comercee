import type { MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";
import { TELE_RAPIDA_ID } from "@/features/frete/teleRapida/teleRapida";

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
  // Frete grátis vale para o envio mais barato pelos Correios/transportadora, não para a tele rápida.
  const envios = opcoes.filter((o) => o.id !== TELE_RAPIDA_ID);
  if (envios.length === 0) return null;
  return [...envios].sort((a, b) => a.precoCentavos - b.precoCentavos)[0]?.id ?? null;
}
