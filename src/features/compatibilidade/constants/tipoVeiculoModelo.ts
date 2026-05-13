export const TIPOS_VEICULO_MODELO = ["carro", "caminhao", "camionete"] as const;

export type TipoVeiculoModelo = (typeof TIPOS_VEICULO_MODELO)[number];

export const TIPO_VEICULO_MODELO_LABELS: Record<TipoVeiculoModelo, string> = {
  carro: "Carro",
  caminhao: "Caminhão",
  camionete: "Camionete",
};

export function parseTipoVeiculoModelo(raw: string): TipoVeiculoModelo | null {
  const v = raw.trim().toLowerCase();
  return (TIPOS_VEICULO_MODELO as readonly string[]).includes(v) ? (v as TipoVeiculoModelo) : null;
}

/** Valores legados no banco (ex.: `moto`) são tratados como carro para exibição e filtros. */
export function normalizeTipoVeiculoModeloFromDb(value: unknown): TipoVeiculoModelo {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "moto") return "carro";
  const parsed = parseTipoVeiculoModelo(v);
  return parsed ?? "carro";
}
