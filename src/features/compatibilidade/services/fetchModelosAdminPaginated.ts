/** PostgREST (Supabase) retorna no máximo 1000 linhas por requisição. */
const PAGE_SIZE = 1000;

export type ModeloAdminDbRow = {
  id: string;
  marca_id: string;
  nome: string;
  tipo_veiculo: string | null;
  marcas: unknown;
};

export type FetchModelosAdminFilters = {
  marcaId?: string;
  /** Trecho do nome do modelo (busca parcial, case insensitive). */
  nome?: string;
};

export type FetchModelosAdminPaginatedResult = {
  rows: ModeloAdminDbRow[];
  error: string | null;
};

type ServerSupabase = Awaited<ReturnType<typeof import("@/services/supabase/server").createClient>>;

/** Remove curingas do ILIKE e limita o tamanho do termo. */
export function normalizeModeloSearchInput(raw: string): string | null {
  const t = raw.trim().replace(/[%_]/g, "");
  if (t.length < 1) return null;
  return t.slice(0, 120);
}

export function marcaNomeFromModeloRow(marcas: unknown): string {
  if (marcas == null) return "?";
  const row = Array.isArray(marcas) ? marcas[0] : marcas;
  if (row && typeof row === "object" && "nome" in row) {
    return String((row as { nome: string }).nome);
  }
  return "?";
}

/**
 * Carrega modelos paginando em lotes de 1000 (filtros opcionais por marca e nome).
 */
export async function fetchModelosAdminPaginated(
  supabase: ServerSupabase,
  filters?: FetchModelosAdminFilters
): Promise<FetchModelosAdminPaginatedResult> {
  const rows: ModeloAdminDbRow[] = [];
  const nomeTerm = filters?.nome ? normalizeModeloSearchInput(filters.nome) : null;
  const marcaId = filters?.marcaId?.trim() || undefined;
  let offset = 0;
  let error: string | null = null;

  while (true) {
    let q = supabase
      .from("modelos")
      .select("id, marca_id, nome, tipo_veiculo, marcas ( nome )")
      .order("nome");

    if (marcaId) {
      q = q.eq("marca_id", marcaId);
    }
    if (nomeTerm) {
      q = q.ilike("nome", `%${nomeTerm}%`);
    }

    const { data, error: pageError } = await q.range(offset, offset + PAGE_SIZE - 1);

    if (pageError) {
      error = pageError.message;
      break;
    }

    const page = (data ?? []) as ModeloAdminDbRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { rows, error };
}
