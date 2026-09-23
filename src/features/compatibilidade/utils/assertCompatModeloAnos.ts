import type { ParsedCompatRow } from "@/features/compatibilidade/utils/compatibilidadesForm";

type ServerSupabase = Awaited<ReturnType<typeof import("@/services/supabase/server").createClient>>;

export type MissingModeloAno = {
  modelo_id: string;
  ano: number;
};

export type AssertCompatModeloAnosResult =
  | { ok: true }
  | { ok: false; message: string; missingAnos?: MissingModeloAno[] };

function formatMissingAnosMessage(missing: MissingModeloAno[]): string {
  const anosUnicos = [...new Set(missing.map((m) => m.ano))].sort((a, b) => a - b);
  if (anosUnicos.length === 1) {
    return `Compatibilidade: o ano ${anosUnicos[0]} precisa estar cadastrado como referência desse modelo em «Marcas e modelos».`;
  }
  const lista =
    anosUnicos.length <= 5
      ? anosUnicos.join(", ")
      : `${anosUnicos.slice(0, 4).join(", ")} e mais ${anosUnicos.length - 4}`;
  return `Compatibilidade: os anos ${lista} precisam estar cadastrados como referência dos modelos em «Marcas e modelos».`;
}

export async function assertCompatUsaAnosCadastrados(
  supabase: ServerSupabase,
  rows: ParsedCompatRow[]
): Promise<AssertCompatModeloAnosResult> {
  if (rows.length === 0) return { ok: true };

  const modeloIds = [...new Set(rows.map((r) => r.modelo_id))];
  const { data, error } = await supabase
    .from("modelo_anos")
    .select("modelo_id, ano")
    .in("modelo_id", modeloIds);

  if (error) {
    const msg = error.message ?? String(error);
    if (error.code === "42P01" || msg.includes("modelo_anos")) {
      return {
        ok: false,
        message:
          "Tabela modelo_anos não encontrada. Execute a migration no Supabase e cadastre os anos de referência dos modelos antes de vincular compatibilidade.",
      };
    }
    return { ok: false, message: `Não foi possível validar anos dos modelos: ${msg}` };
  }

  const byModel = new Map<string, Set<number>>();
  for (const row of data ?? []) {
    const mid = String((row as { modelo_id: string }).modelo_id);
    const set = byModel.get(mid) ?? new Set<number>();
    set.add(Number((row as { ano: number }).ano));
    byModel.set(mid, set);
  }

  const missingAnos: MissingModeloAno[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const set = byModel.get(r.modelo_id);
    for (let y = r.ano_inicio; y <= r.ano_fim; y++) {
      if (set?.has(y)) continue;
      const key = `${r.modelo_id}:${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      missingAnos.push({ modelo_id: r.modelo_id, ano: y });
    }
  }

  if (missingAnos.length === 0) return { ok: true };

  const algumModeloSemNenhumAno = rows.some((r) => {
    const set = byModel.get(r.modelo_id);
    return !set || set.size === 0;
  });

  if (algumModeloSemNenhumAno && missingAnos.length > 0) {
    const soUmModeloSemAnos =
      [...new Set(rows.map((r) => r.modelo_id))].length === 1 &&
      (!byModel.get(rows[0].modelo_id) || byModel.get(rows[0].modelo_id)!.size === 0);

    if (soUmModeloSemAnos) {
      return {
        ok: false,
        message:
          "Compatibilidade: cadastre anos de referência para este modelo em «Marcas e modelos» antes de vincular ao produto.",
        missingAnos,
      };
    }
  }

  return {
    ok: false,
    message: formatMissingAnosMessage(missingAnos),
    missingAnos,
  };
}
