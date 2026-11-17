import { clampPercent } from "@/features/produtos/utils/paymentDiscount";
import type { KitCombo, KitDescontoPadrao } from "@/types/kit";

export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Valor economizado (R$) para um percentual sobre a base. */
export function economiaDescontoPercentual(base: number, pct: number): number {
  const b = Number(base);
  if (!Number.isFinite(b) || b <= 0) return 0;
  return roundMoney(b * (clampPercent(pct) / 100));
}

export function precoAposDescontoPercentual(base: number, pct: number): number {
  const b = Number(base);
  if (!Number.isFinite(b) || b <= 0) return 0;
  return roundMoney(b * (1 - clampPercent(pct) / 100));
}

export function comboReferenciaValores(
  produtos: Array<{ valor: number }>,
  combo: KitCombo | null,
): { valorKit: number; valorCombo: number } {
  const valores = produtos.map((p) => Number(p.valor)).filter((v) => Number.isFinite(v) && v > 0);
  const valorKit = valores.length > 0 ? Math.min(...valores) : 0;
  if (!combo?.opcoes.length || valorKit <= 0) {
    return { valorKit, valorCombo: 0 };
  }
  const minOleo = Math.min(...combo.opcoes.map((o) => o.valor));
  const valorCombo = roundMoney(valorKit + minOleo * combo.qtd_padrao);
  return { valorKit, valorCombo };
}

export type EconomiasPadraoReferencia = {
  kitPix: number;
  kitCartao: number;
  comboPix: number;
  comboCartao: number;
};

export function economiasPadraoReferencia(
  refs: { valorKit: number; valorCombo: number },
  descontos: KitDescontoPadrao,
): EconomiasPadraoReferencia {
  return {
    kitPix: economiaDescontoPercentual(refs.valorKit, descontos.kit_pix),
    kitCartao: economiaDescontoPercentual(refs.valorKit, descontos.kit_cartao),
    comboPix: economiaDescontoPercentual(refs.valorCombo, descontos.combo_pix),
    comboCartao: economiaDescontoPercentual(refs.valorCombo, descontos.combo_cartao),
  };
}