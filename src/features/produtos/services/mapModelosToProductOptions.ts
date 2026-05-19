import { normalizeTipoVeiculoModeloFromDb } from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import type { ModeloOption } from "@/features/produtos/components/ProductCompatibilidadeFieldset";

export type ModeloDbRow = {
  id: string;
  nome: string;
  tipo_veiculo?: string | null;
  marcas: unknown;
};

function marcaNomeFromRow(marcas: unknown): string {
  if (marcas == null) return "?";
  const row = Array.isArray(marcas) ? marcas[0] : marcas;
  if (row && typeof row === "object" && "nome" in row) {
    return String((row as { nome: string }).nome);
  }
  return "?";
}

function sortedUniqueInts(nums: number[]): number[] {
  return [...new Set(nums)].sort((a, b) => a - b);
}

export function mapModelosToProductOptions(
  rows: ModeloDbRow[],
  anosByModeloId: Map<string, number[]>,
  extrasPorModelo?: Map<string, Set<number>>
): ModeloOption[] {
  return rows.map((row) => {
    const base = sortedUniqueInts(anosByModeloId.get(row.id) ?? []);
    const ex = extrasPorModelo?.get(row.id);
    const anos_referencia = ex ? sortedUniqueInts([...base, ...ex]) : base;

    return {
      id: row.id,
      nome: row.nome,
      marca_nome: marcaNomeFromRow(row.marcas),
      tipo_veiculo: normalizeTipoVeiculoModeloFromDb(row.tipo_veiculo),
      anos_referencia,
    };
  });
}

export function extrasPorModeloFromCompatRows(
  compatRows: { modelo_id: string; ano_inicio: string; ano_fim: string }[]
): Map<string, Set<number>> {
  const extrasPorModelo = new Map<string, Set<number>>();
  for (const c of compatRows) {
    if (!c.modelo_id) continue;
    const s = extrasPorModelo.get(c.modelo_id) ?? new Set<number>();
    const ai = Number.parseInt(c.ano_inicio, 10);
    const af = Number.parseInt(c.ano_fim, 10);
    if (!Number.isNaN(ai) && !Number.isNaN(af) && ai <= af) {
      for (let y = ai; y <= af; y++) s.add(y);
    }
    extrasPorModelo.set(c.modelo_id, s);
  }
  return extrasPorModelo;
}
