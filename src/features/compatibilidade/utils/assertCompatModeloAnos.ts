import type { ParsedCompatRow } from "@/features/compatibilidade/utils/compatibilidadesForm";

type ServerSupabase = Awaited<ReturnType<typeof import("@/services/supabase/server").createClient>>;

export async function assertCompatUsaAnosCadastrados(
  supabase: ServerSupabase,
  rows: ParsedCompatRow[]
): Promise<{ ok: true } | { ok: false; message: string }> {
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

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const set = byModel.get(r.modelo_id);
    if (!set || set.size === 0) {
      return {
        ok: false,
        message: `Compatibilidade: cadastre anos de referência para este modelo em «Marcas e modelos» antes de vincular ao produto.`,
      };
    }
    for (let y = r.ano_inicio; y <= r.ano_fim; y++) {
      if (!set.has(y)) {
        return {
          ok: false,
          message: `Compatibilidade: o ano ${y} precisa estar cadastrado como referência desse modelo em «Marcas e modelos».`,
        };
      }
    }
  }

  return { ok: true };
}
