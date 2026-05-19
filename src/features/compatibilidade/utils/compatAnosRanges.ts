export type AnoFaixa = { ano_inicio: number; ano_fim: number };

export function sortedUniqueInts(nums: number[]): number[] {
  return [...new Set(nums)].sort((a, b) => a - b);
}

/** Agrupa anos consecutivos em faixas (ex.: [2015,2016,2018] → 2015-2016 e 2018-2018). */
export function anosParaFaixas(anos: number[]): AnoFaixa[] {
  const sorted = sortedUniqueInts(anos);
  if (sorted.length === 0) return [];

  const faixas: AnoFaixa[] = [];
  let ini = sorted[0];
  let fim = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const y = sorted[i];
    if (y === fim + 1) {
      fim = y;
    } else {
      faixas.push({ ano_inicio: ini, ano_fim: fim });
      ini = y;
      fim = y;
    }
  }
  faixas.push({ ano_inicio: ini, ano_fim: fim });
  return faixas;
}

/** Expande faixas em lista de anos (para UI e validação). */
export function faixasParaAnos(faixas: AnoFaixa[]): number[] {
  const out: number[] = [];
  for (const { ano_inicio, ano_fim } of faixas) {
    if (ano_inicio > ano_fim) continue;
    for (let y = ano_inicio; y <= ano_fim; y++) {
      out.push(y);
    }
  }
  return sortedUniqueInts(out);
}

export function faixasFromCompatStrings(
  rows: { ano_inicio: string; ano_fim: string }[]
): AnoFaixa[] {
  const faixas: AnoFaixa[] = [];
  for (const r of rows) {
    const ai = Number.parseInt(r.ano_inicio, 10);
    const af = Number.parseInt(r.ano_fim, 10);
    if (Number.isNaN(ai) || Number.isNaN(af) || ai > af) continue;
    faixas.push({ ano_inicio: ai, ano_fim: af });
  }
  return faixas;
}
