import { notFound } from "next/navigation";
import { fetchAllModeloAnosPaginated } from "@/features/compatibilidade/services/fetchAllModeloAnosPaginated";
import { createClient } from "@/services/supabase/server";
import type { CategoriaOption } from "@/features/produtos/components/ProductCategoriasFieldset";
import type { EmbalagemOption } from "@/features/produtos/components/ProductEmbalagemFieldset";
import {
  ProductEditForm,
  type ModeloOption,
  type ProductEditValues,
} from "@/features/produtos/components/ProductEditForm";
import type { ProdutoRelacionadoOption } from "@/features/produtos/components/ProductRelacionadosFieldset";
import {
  extrasPorModeloFromCompatRows,
  mapModelosToProductOptions,
  type ModeloDbRow,
} from "@/features/produtos/services/mapModelosToProductOptions";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("produtos").select("titulo").eq("id", id).maybeSingle();
    if (data?.titulo) {
      return { title: `${data.titulo} | Editar | Admin` };
    }
  } catch {
    /* ignore */
  }
  return { title: "Editar produto | Admin" };
}

export default async function EditProdutoPage({ params }: PageProps) {
  const { id } = await params;

  let modelos: ModeloOption[] = [];
  let categorias: CategoriaOption[] = [];
  let productValues: ProductEditValues | null = null;
  let embalagens: EmbalagemOption[] = [];
  let produtosRelacionadosOpcoes: ProdutoRelacionadoOption[] = [];
  let configError: string | null = null;
  let produtoLoadError: string | null = null;
  let modelosLoadError: string | null = null;
  let modeloAnosLoadError: string | null = null;
  let categoriasLoadError: string | null = null;
  let embalagensLoadError: string | null = null;

  try {
    const supabase = await createClient();

    const [
      prodResult,
      compResult,
      fotosResult,
      catLinkResult,
      relLinkResult,
      embResult,
      modeloResult,
      anosResult,
      catResult,
      relProdResult,
    ] = await Promise.all([
      supabase
        .from("produtos")
        .select(
          "id, titulo, cod_produto, descricao, valor, foto, quantidade_estoque, em_destaque, compat_todos_modelos, prod_comprimento_cm, prod_largura_cm, prod_altura_cm, prod_peso_kg, embalagem_id, desconto_pix_percent, desconto_cartao_percent"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("produto_compatibilidades")
        .select("modelo_id, ano_inicio, ano_fim")
        .eq("produto_id", id)
        .order("ano_inicio"),
      supabase
        .from("produto_fotos")
        .select("foto, is_principal, ordem")
        .eq("produto_id", id)
        .order("ordem", { ascending: true }),
      supabase.from("produto_categorias").select("categoria_id").eq("produto_id", id),
      supabase.from("produto_relacionados").select("relacionado_id").eq("produto_id", id),
      supabase
        .from("embalagens")
        .select("id, nome, comprimento_cm, largura_cm, altura_cm, peso_embalagem_kg")
        .order("nome"),
      supabase
        .from("modelos")
        .select("id, nome, tipo_veiculo, marcas ( nome )")
        .order("nome"),
      fetchAllModeloAnosPaginated(supabase),
      supabase.from("categorias").select("id, nome, icone").order("nome"),
      supabase.from("produtos").select("id, titulo, cod_produto").neq("id", id).order("titulo"),
    ]);

    const { data: produto, error: prodError } = prodResult;

    if (prodError) {
      produtoLoadError = prodError.message;
    } else if (!produto) {
      notFound();
    } else {
      const compRows = compResult.data;
      const fotosRows = fotosResult.data;
      const catLinkRows = catLinkResult.data;
      const catLinkErr = catLinkResult.error;
      const relLinkRows = relLinkResult.data;

      if (catLinkErr) {
        categoriasLoadError = catLinkErr.message;
      }

      const p = produto as typeof produto & {
        prod_comprimento_cm?: number | string | null;
        prod_largura_cm?: number | string | null;
        prod_altura_cm?: number | string | null;
        prod_peso_kg?: number | string | null;
        embalagem_id?: string | null;
        desconto_pix_percent?: number | string | null;
        desconto_cartao_percent?: number | string | null;
      };

      const dp = Number(p.desconto_pix_percent);
      const dc = Number(p.desconto_cartao_percent);

      productValues = {
        id: p.id,
        titulo: p.titulo,
        cod_produto: p.cod_produto,
        descricao: p.descricao ?? "",
        valor: Number(p.valor),
        foto: p.foto ?? "",
        fotos: (fotosRows ?? []).map((row) => ({
          foto: row.foto,
          is_principal: row.is_principal === true,
          ordem: Number.isFinite(row.ordem) ? Number(row.ordem) : 0,
        })),
        quantidade_estoque: p.quantidade_estoque,
        em_destaque: Boolean(p.em_destaque),
        compat_todos_modelos: Boolean((p as { compat_todos_modelos?: boolean | null }).compat_todos_modelos),
        categoria_ids: catLinkErr ? [] : (catLinkRows ?? []).map((r) => r.categoria_id),
        compat_rows: (compRows ?? []).map((c) => ({
          modelo_id: c.modelo_id,
          ano_inicio: c.ano_inicio != null ? String(c.ano_inicio) : "",
          ano_fim: c.ano_fim != null ? String(c.ano_fim) : "",
        })),
        prod_comprimento_cm: p.prod_comprimento_cm != null ? Number(p.prod_comprimento_cm) : null,
        prod_largura_cm: p.prod_largura_cm != null ? Number(p.prod_largura_cm) : null,
        prod_altura_cm: p.prod_altura_cm != null ? Number(p.prod_altura_cm) : null,
        prod_peso_kg: p.prod_peso_kg != null ? Number(p.prod_peso_kg) : null,
        embalagem_id: p.embalagem_id ?? null,
        desconto_pix_percent: Number.isFinite(dp) ? Math.min(100, Math.max(0, dp)) : 0,
        desconto_cartao_percent: Number.isFinite(dc) ? Math.min(100, Math.max(0, dc)) : 0,
        relacionado_ids: (relLinkRows ?? []).map((r) => r.relacionado_id as string).filter(Boolean),
      };
    }

    if (embResult.error) {
      embalagensLoadError = embResult.error.message;
    } else if (embResult.data) {
      embalagens = embResult.data.map((row) => ({
        id: row.id,
        nome: row.nome,
        comprimento_cm: Number(row.comprimento_cm),
        largura_cm: Number(row.largura_cm),
        altura_cm: Number(row.altura_cm),
        peso_embalagem_kg: Number(row.peso_embalagem_kg),
      }));
    }

    if (modeloResult.error) {
      modelosLoadError = modeloResult.error.message;
    } else if (modeloResult.data) {
      if (anosResult.error) {
        modeloAnosLoadError = anosResult.error;
      }
      const extras = productValues
        ? extrasPorModeloFromCompatRows(productValues.compat_rows)
        : undefined;
      modelos = mapModelosToProductOptions(
        modeloResult.data as ModeloDbRow[],
        anosResult.anosByModeloId,
        extras
      );
    }

    if (catResult.error) {
      if (!categoriasLoadError) categoriasLoadError = catResult.error.message;
    } else if (catResult.data) {
      categorias = catResult.data as CategoriaOption[];
    }

    if (relProdResult.data) {
      produtosRelacionadosOpcoes = relProdResult.data as ProdutoRelacionadoOption[];
    }
  } catch (e) {
    configError = e instanceof Error ? e.message : "Erro ao carregar configuração.";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Configuração</p>
          <p className="mt-1">{configError}</p>
        </div>
      )}

      {produtoLoadError && !configError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
          role="alert"
        >
          Não foi possível carregar o produto: {produtoLoadError}
        </div>
      )}

      {modelosLoadError && !configError && productValues && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Modelos não carregados ({modelosLoadError}). Você ainda pode editar os demais campos.
        </div>
      )}

      {modeloAnosLoadError && !configError && productValues && !modelosLoadError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Anos de referência dos modelos não carregados ({modeloAnosLoadError}). A compatibilidade pode
          aparecer incompleta até recarregar a página.
        </div>
      )}

      {categoriasLoadError && !configError && productValues && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Categorias não carregadas ({categoriasLoadError}). Rode o SQL em{" "}
          <code className="rounded bg-black/5 px-1">supabase/migrations/20260411120000_categorias.sql</code> se
          necessário.
        </div>
      )}

      {embalagensLoadError && !configError && productValues && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          Embalagens não carregadas ({embalagensLoadError}). Aplique{" "}
          <code className="rounded bg-black/5 px-1">supabase/migrations/20260413220000_produto_dimensoes_embalagens.sql</code>{" "}
          no Supabase.
        </div>
      )}

      {!configError && !produtoLoadError && productValues && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
          <ProductEditForm
            product={productValues}
            modelos={modelos}
            categorias={categorias}
            embalagens={embalagens}
            produtosRelacionadosOpcoes={produtosRelacionadosOpcoes}
          />
        </div>
      )}
    </div>
  );
}
