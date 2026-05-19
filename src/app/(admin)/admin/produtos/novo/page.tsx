import { ProductForm } from "@/features/produtos/components/ProductForm";
import { getProductFormOptions } from "@/features/produtos/services/getProductFormOptions";
import { createClient } from "@/services/supabase/server";

export const metadata = {
  title: "Novo produto | Admin",
};

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicar?: string | string[] }>;
}) {
  const {
    modelos,
    categorias,
    embalagens,
    produtosRelacionadosOpcoes,
    configError,
    loadError,
    modeloAnosLoadError,
    categoriasLoadError,
    embalagensLoadError,
  } = await getProductFormOptions();
  const sp = await searchParams;
  const duplicarId =
    typeof sp.duplicar === "string" ? sp.duplicar : Array.isArray(sp.duplicar) ? sp.duplicar[0] : "";
  let duplicateLoadError: string | null = null;
  let initialValues:
    | {
        titulo?: string;
        cod_produto?: string;
        descricao?: string;
        valor?: number;
        quantidade_estoque?: number;
        desconto_pix_percent?: number;
        desconto_cartao_percent?: number;
        foto?: string;
        fotos?: Array<{ foto: string; is_principal: boolean; ordem: number }>;
        em_destaque?: boolean;
        categoria_ids?: string[];
        compat_rows?: Array<{ modelo_id: string; ano_inicio: string; ano_fim: string }>;
        compat_todos_modelos?: boolean;
        relacionado_ids?: string[];
        prod_comprimento_cm?: number | null;
        prod_largura_cm?: number | null;
        prod_altura_cm?: number | null;
        prod_peso_kg?: number | null;
        embalagem_id?: string | null;
      }
    | undefined;

  if (duplicarId) {
    try {
      const supabase = await createClient();
      const { data: produto, error: prodError } = await supabase
        .from("produtos")
        .select(
          "id, titulo, cod_produto, descricao, valor, foto, quantidade_estoque, em_destaque, compat_todos_modelos, prod_comprimento_cm, prod_largura_cm, prod_altura_cm, prod_peso_kg, embalagem_id, desconto_pix_percent, desconto_cartao_percent"
        )
        .eq("id", duplicarId)
        .maybeSingle();

      if (prodError || !produto) {
        duplicateLoadError = prodError?.message ?? "Produto de origem não encontrado para duplicação.";
      } else {
        const [{ data: compRows }, { data: fotosRows }, { data: catRows }, { data: relRows }] = await Promise.all([
          supabase
            .from("produto_compatibilidades")
            .select("modelo_id, ano_inicio, ano_fim")
            .eq("produto_id", duplicarId)
            .order("ano_inicio"),
          supabase
            .from("produto_fotos")
            .select("foto, is_principal, ordem")
            .eq("produto_id", duplicarId)
            .order("ordem", { ascending: true }),
          supabase.from("produto_categorias").select("categoria_id").eq("produto_id", duplicarId),
          supabase.from("produto_relacionados").select("relacionado_id").eq("produto_id", duplicarId),
        ]);

        const codeBase = String(produto.cod_produto ?? "").trim();
        const duplicatedCode = codeBase ? `${codeBase}-COPIA` : "";
        const titleBase = String(produto.titulo ?? "").trim();
        const duplicatedTitle = titleBase ? `${titleBase} COPIA` : "";
        initialValues = {
          titulo: duplicatedTitle,
          cod_produto: duplicatedCode,
          descricao: produto.descricao ?? "",
          valor: Number(produto.valor),
          quantidade_estoque: 0,
          desconto_pix_percent: Number(produto.desconto_pix_percent ?? 0),
          desconto_cartao_percent: Number(produto.desconto_cartao_percent ?? 0),
          foto: produto.foto ?? "",
          fotos: (fotosRows ?? []).map((row) => ({
            foto: row.foto,
            is_principal: row.is_principal === true,
            ordem: Number.isFinite(row.ordem) ? Number(row.ordem) : 0,
          })),
          em_destaque: false,
          categoria_ids: (catRows ?? []).map((row) => row.categoria_id),
          compat_rows: (compRows ?? []).map((row) => ({
            modelo_id: row.modelo_id,
            ano_inicio: row.ano_inicio != null ? String(row.ano_inicio) : "",
            ano_fim: row.ano_fim != null ? String(row.ano_fim) : "",
          })),
          compat_todos_modelos: Boolean(produto.compat_todos_modelos),
          relacionado_ids: (relRows ?? []).map((row) => row.relacionado_id).filter(Boolean),
          prod_comprimento_cm:
            produto.prod_comprimento_cm != null ? Number(produto.prod_comprimento_cm) : null,
          prod_largura_cm: produto.prod_largura_cm != null ? Number(produto.prod_largura_cm) : null,
          prod_altura_cm: produto.prod_altura_cm != null ? Number(produto.prod_altura_cm) : null,
          prod_peso_kg: produto.prod_peso_kg != null ? Number(produto.prod_peso_kg) : null,
          embalagem_id: produto.embalagem_id ?? null,
        };
      }
    } catch (error) {
      duplicateLoadError = error instanceof Error ? error.message : "Falha ao carregar produto para duplicação.";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {duplicarId && !duplicateLoadError && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 shadow-sm">
          Modo duplicação ativo: revise título, código e estoque antes de salvar.
        </div>
      )}

      {duplicateLoadError && !configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Não foi possível carregar os dados para duplicação ({duplicateLoadError}). Você ainda pode cadastrar
          manualmente.
        </div>
      )}

      {configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Configuração</p>
          <p className="mt-1">{configError}</p>
          <p className="mt-2 text-xs text-amber-800/80">
            Crie <code className="rounded bg-black/5 px-1">.env</code> ou{" "}
            <code className="rounded bg-black/5 px-1">.env.local</code> com NEXT_PUBLIC_SUPABASE_URL e
            NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      )}

      {loadError && !configError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
          role="alert"
        >
          Não foi possível carregar modelos: {loadError}
        </div>
      )}

      {modeloAnosLoadError && !configError && !loadError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Anos de referência dos modelos não carregados ({modeloAnosLoadError}). Modelos podem aparecer sem
          anos na compatibilidade; recarregue a página ou confira «Marcas e modelos».
        </div>
      )}

      {categoriasLoadError && !configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Categorias não carregadas ({categoriasLoadError}). Você ainda pode cadastrar o produto; rode o SQL em{" "}
          <code className="rounded bg-black/5 px-1">supabase/migrations/20260411120000_categorias.sql</code> se
          necessário.
        </div>
      )}

      {embalagensLoadError && !configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Embalagens não carregadas ({embalagensLoadError}). Aplique{" "}
          <code className="rounded bg-black/5 px-1">supabase/migrations/20260413220000_produto_dimensoes_embalagens.sql</code>{" "}
          no Supabase para habilitar dimensões e embalagem.
        </div>
      )}

      {!configError && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <ProductForm
            modelos={modelos}
            categorias={categorias}
            embalagens={embalagens}
            produtosRelacionadosOpcoes={produtosRelacionadosOpcoes}
            initialValues={initialValues}
          />
        </div>
      )}
    </div>
  );
}
