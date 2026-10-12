import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_STATUS_PUBLISHED } from "@/features/produtos/utils/productStatus";

/** Remove curingas perigosos do ILIKE e limita o tamanho. */
export function normalizeProductSearchInput(raw: string): string | null {
  const t = raw.trim().replace(/[%_]/g, "");
  if (t.length < 1) return null;
  return t.slice(0, 80);
}

/** PostgREST devolve no máximo 1000 linhas por requisição. */
const PAGE_SIZE = 1000;
/** Teto de segurança para termos muito genéricos. */
const MAX_PAGES = 10;

type ProdutoIdRow = { produto_id: unknown };
type PageResult = { data: ProdutoIdRow[] | null; error: unknown };

/** Pagina uma consulta de `produto_compatibilidades` e devolve os `produto_id` distintos. */
async function collectProdutoIds(page: (from: number, to: number) => PromiseLike<PageResult>): Promise<string[]> {
  const ids = new Set<string>();
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    for (const row of data) if (row.produto_id) ids.add(row.produto_id as string);
    if (data.length < PAGE_SIZE) break;
  }
  return [...ids];
}

/**
 * IDs de produtos compatíveis com algum modelo das marcas informadas. Filtra pela relação
 * (`modelos!inner`) em vez de mandar centenas de IDs de modelo na URL.
 */
export function fetchProductIdsCompatComMarcas(supabase: SupabaseClient, marcaIds: string[]): Promise<string[]> {
  return collectProdutoIds((from, to) =>
    supabase
      .from("produto_compatibilidades")
      .select("produto_id, modelos!inner(marca_id)")
      .in("modelos.marca_id", marcaIds)
      .order("produto_id")
      .range(from, to)
  );
}

/**
 * IDs de produtos cujo título/código contém o termo OU que tenham compatibilidade
 * com modelo ou marca de veículo cujo nome contém o termo (case insensitive).
 *
 * Tudo numa rodada paralela: os filtros por nome de modelo/marca usam embed `!inner`
 * no PostgREST (antes: buscava os IDs dos modelos e os mandava num `.in()` na URL, que
 * para marcas grandes passava de 20 KB e falhava).
 */
export async function fetchProductIdsMatchingSearchTerm(
  supabase: SupabaseClient,
  raw: string
): Promise<string[]> {
  const q = normalizeProductSearchInput(raw);
  if (!q) return [];

  const pattern = `%${q}%`;

  const [byTitulo, byCod, byModeloNome, byMarcaNome, modeloMatch, marcaMatch, todosModelos] =
    await Promise.all([
      supabase.from("produtos").select("id").eq("status", PRODUCT_STATUS_PUBLISHED).ilike("titulo", pattern),
      supabase.from("produtos").select("id").eq("status", PRODUCT_STATUS_PUBLISHED).ilike("cod_produto", pattern),
      collectProdutoIds((from, to) =>
        supabase
          .from("produto_compatibilidades")
          .select("produto_id, modelos!inner(nome)")
          .ilike("modelos.nome", pattern)
          .order("produto_id")
          .range(from, to)
      ),
      collectProdutoIds((from, to) =>
        supabase
          .from("produto_compatibilidades")
          .select("produto_id, modelos!inner(marcas!inner(nome))")
          .ilike("modelos.marcas.nome", pattern)
          .order("produto_id")
          .range(from, to)
      ),
      supabase.from("modelos").select("id").ilike("nome", pattern).limit(1),
      supabase.from("marcas").select("id").ilike("nome", pattern).limit(1),
      supabase
        .from("produtos")
        .select("id")
        .eq("status", PRODUCT_STATUS_PUBLISHED)
        .eq("compat_todos_modelos", true),
    ]);

  const ids = new Set<string>();
  for (const row of byTitulo.data ?? []) if (row.id) ids.add(row.id as string);
  for (const row of byCod.data ?? []) if (row.id) ids.add(row.id as string);
  for (const id of byModeloNome) ids.add(id);
  for (const id of byMarcaNome) ids.add(id);

  // Termo de veículo (modelo ou marca existente): produtos "servem em todos" também valem.
  const termoDeVeiculo = (modeloMatch.data ?? []).length > 0 || (marcaMatch.data ?? []).length > 0;
  if (termoDeVeiculo) {
    for (const row of todosModelos.data ?? []) if (row.id) ids.add(row.id as string);
  }

  return [...ids];
}
