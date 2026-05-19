/** PostgREST (Supabase) retorna no máximo 1000 linhas por requisição. */
const PAGE_SIZE = 1000;

export type ModeloAnoRef = { id: string; ano: number };

export type ModeloAnosResumo = {
  count: number;
  anoMin: number;
  anoMax: number;
};

export type FetchModeloAnosSummaryResult = {
  summaryByModeloId: Map<string, ModeloAnosResumo>;
  error: string | null;
};

export type FetchAllModeloAnosResult = {
  anosByModeloId: Map<string, number[]>;
  /** Preenchido quando `includeIds: true` (ex.: admin Marcas e modelos). */
  refsByModeloId: Map<string, ModeloAnoRef[]> | null;
  error: string | null;
};

type ServerSupabase = Awaited<ReturnType<typeof import("@/services/supabase/server").createClient>>;

function sortedUniqueInts(nums: number[]): number[] {
  return [...new Set(nums)].sort((a, b) => a - b);
}

/**
 * Carrega todas as linhas de `modelo_anos` paginando em lotes de 1000.
 * Sem paginação, modelos além do primeiro lote aparecem sem anos no formulário de produto.
 */
export async function fetchAllModeloAnosPaginated(
  supabase: ServerSupabase,
  options?: { includeIds?: boolean }
): Promise<FetchAllModeloAnosResult> {
  const includeIds = options?.includeIds ?? false;
  const rawByModelo = new Map<string, number[]>();
  const refsByModeloId = includeIds ? new Map<string, ModeloAnoRef[]>() : null;
  let offset = 0;
  let error: string | null = null;

  while (true) {
    const { data, error: pageError } = includeIds
      ? await supabase
          .from("modelo_anos")
          .select("id, modelo_id, ano")
          .order("modelo_id")
          .order("ano", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1)
      : await supabase
          .from("modelo_anos")
          .select("modelo_id, ano")
          .order("modelo_id")
          .order("ano", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

    if (pageError) {
      error = pageError.message;
      break;
    }

    const rows = (data ?? []) as unknown as Array<{ id?: string; modelo_id: string; ano: number }>;
    for (const row of rows) {
      const modeloId = String(row.modelo_id);
      const ano = Number(row.ano);
      if (!modeloId || !Number.isFinite(ano)) continue;

      const list = rawByModelo.get(modeloId) ?? [];
      list.push(ano);
      rawByModelo.set(modeloId, list);

      if (refsByModeloId && row.id) {
        const refs = refsByModeloId.get(modeloId) ?? [];
        refs.push({ id: String(row.id), ano });
        refsByModeloId.set(modeloId, refs);
      }
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const anosByModeloId = new Map<string, number[]>();
  for (const [modeloId, anos] of rawByModelo) {
    anosByModeloId.set(modeloId, sortedUniqueInts(anos));
  }

  if (refsByModeloId) {
    for (const [modeloId, refs] of refsByModeloId) {
      refsByModeloId.set(
        modeloId,
        [...refs].sort((a, b) => a.ano - b.ano)
      );
    }
  }

  return { anosByModeloId, refsByModeloId, error };
}

/**
 * Agrega min/max/contagem por modelo sem carregar ids (listagem admin).
 * Pagina `modelo_anos` em lotes de 1000 para não truncar o catálogo.
 */
export async function fetchModeloAnosSummaryPaginated(
  supabase: ServerSupabase
): Promise<FetchModeloAnosSummaryResult> {
  const summaryByModeloId = new Map<string, ModeloAnosResumo>();
  let offset = 0;
  let error: string | null = null;

  while (true) {
    const { data, error: pageError } = await supabase
      .from("modelo_anos")
      .select("modelo_id, ano")
      .order("modelo_id")
      .order("ano", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (pageError) {
      error = pageError.message;
      break;
    }

    const rows = (data ?? []) as Array<{ modelo_id: string; ano: number }>;
    for (const row of rows) {
      const modeloId = String(row.modelo_id);
      const ano = Number(row.ano);
      if (!modeloId || !Number.isFinite(ano)) continue;

      const prev = summaryByModeloId.get(modeloId);
      if (!prev) {
        summaryByModeloId.set(modeloId, { count: 1, anoMin: ano, anoMax: ano });
      } else {
        prev.count += 1;
        if (ano < prev.anoMin) prev.anoMin = ano;
        if (ano > prev.anoMax) prev.anoMax = ano;
      }
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { summaryByModeloId, error };
}
