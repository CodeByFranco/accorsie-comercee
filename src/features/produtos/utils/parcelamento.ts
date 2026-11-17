/** Faixa: a partir deste valor (inclusive), o cartão parcela em até N vezes sem juros. */
export type ParcelamentoFaixa = {
  valorMinimo: number;
  maxParcelas: number;
};

/** Usado se a tabela ainda não existir. Abaixo de R$ 100 o cartão fica à vista. */
export const PARCELAMENTO_FAIXAS_PADRAO: ParcelamentoFaixa[] = [
  { valorMinimo: 100, maxParcelas: 2 },
  { valorMinimo: 500, maxParcelas: 6 },
];

export const PARCELAS_SEM_JUROS_MIN = 2;
export const PARCELAS_SEM_JUROS_MAX = 12;

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function sortParcelamentoFaixas(faixas: ParcelamentoFaixa[]): ParcelamentoFaixa[] {
  return [...faixas].sort((a, b) => a.valorMinimo - b.valorMinimo || a.maxParcelas - b.maxParcelas);
}

/**
 * Maior teto cuja faixa ainda cabe no valor. Sem faixa aplicável, 1 (à vista).
 * Comparação é "a partir de": valor >= mínimo.
 */
export function maxParcelasSemJuros(amountBrl: number, faixas: ParcelamentoFaixa[]): number {
  let max = 1;
  for (const faixa of sortParcelamentoFaixas(faixas)) {
    if (!Number.isFinite(faixa.valorMinimo) || !Number.isFinite(faixa.maxParcelas)) continue;
    if (amountBrl >= faixa.valorMinimo) max = faixa.maxParcelas;
  }
  return max < 1 ? 1 : max;
}

/** Limite enviado ao Mercado Pago: o mesmo teto sem juros da faixa vigente. */
export function maxParcelasCheckout(amountBrl: number, faixas: ParcelamentoFaixa[]): number {
  return maxParcelasSemJuros(amountBrl, faixas);
}

export function valorParcelaIgual(amountBrl: number, parcelas: number): number {
  if (parcelas < 1) return amountBrl;
  return Math.round((amountBrl / parcelas) * 100) / 100;
}

/** Texto da prévia no admin. */
export function resumoParcelamentoFaixas(faixas: ParcelamentoFaixa[]): string {
  const sorted = sortParcelamentoFaixas(faixas).filter(
    (f) => f.valorMinimo > 0 && f.maxParcelas >= PARCELAS_SEM_JUROS_MIN,
  );
  if (sorted.length === 0) {
    return "Nenhuma faixa: o cartão fica sempre à vista, sem parcelamento.";
  }
  const partes = [`Abaixo de ${money.format(sorted[0].valorMinimo)}: à vista no cartão.`];
  for (const faixa of sorted) {
    partes.push(
      `A partir de ${money.format(faixa.valorMinimo)}: até ${faixa.maxParcelas}x sem juros.`,
    );
  }
  return partes.join(" ");
}
