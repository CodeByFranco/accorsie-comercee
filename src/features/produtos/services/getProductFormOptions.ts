import { fetchAllModeloAnosPaginated } from "@/features/compatibilidade/services/fetchAllModeloAnosPaginated";
import type { CategoriaOption } from "@/features/produtos/components/ProductCategoriasFieldset";
import type { EmbalagemOption } from "@/features/produtos/components/ProductEmbalagemFieldset";
import type {
  ModeloOption,
  ProdutoRelacionadoOption,
} from "@/features/produtos/components/ProductForm";
import {
  mapModelosToProductOptions,
  type ModeloDbRow,
} from "@/features/produtos/services/mapModelosToProductOptions";
import { createClient } from "@/services/supabase/server";

export type ProductFormOptionsResult = {
  modelos: ModeloOption[];
  categorias: CategoriaOption[];
  embalagens: EmbalagemOption[];
  produtosRelacionadosOpcoes: ProdutoRelacionadoOption[];
  configError: string | null;
  loadError: string | null;
  modeloAnosLoadError: string | null;
  categoriasLoadError: string | null;
  embalagensLoadError: string | null;
};

export async function getProductFormOptions(): Promise<ProductFormOptionsResult> {
  let modelos: ModeloOption[] = [];
  let categorias: CategoriaOption[] = [];
  let embalagens: EmbalagemOption[] = [];
  let produtosRelacionadosOpcoes: ProdutoRelacionadoOption[] = [];
  let configError: string | null = null;
  let loadError: string | null = null;
  let modeloAnosLoadError: string | null = null;
  let categoriasLoadError: string | null = null;
  let embalagensLoadError: string | null = null;

  try {
    const supabase = await createClient();

    const [modelosRes, anosResult, catRes, embRes, relProdRes] = await Promise.all([
      supabase
        .from("modelos")
        .select("id, nome, tipo_veiculo, marcas ( nome )")
        .order("nome"),
      fetchAllModeloAnosPaginated(supabase),
      supabase.from("categorias").select("id, nome, icone").order("nome"),
      supabase
        .from("embalagens")
        .select("id, nome, comprimento_cm, largura_cm, altura_cm, peso_embalagem_kg")
        .order("nome"),
      supabase.from("produtos").select("id, titulo, cod_produto").order("titulo"),
    ]);

    if (modelosRes.error) {
      loadError = modelosRes.error.message;
    } else if (modelosRes.data) {
      if (anosResult.error) {
        modeloAnosLoadError = anosResult.error;
      }
      modelos = mapModelosToProductOptions(
        modelosRes.data as ModeloDbRow[],
        anosResult.anosByModeloId
      );
    }

    if (catRes.error) {
      categoriasLoadError = catRes.error.message;
    } else if (catRes.data) {
      categorias = catRes.data as CategoriaOption[];
    }

    if (embRes.error) {
      embalagensLoadError = embRes.error.message;
    } else if (embRes.data) {
      embalagens = embRes.data.map((row) => ({
        id: row.id,
        nome: row.nome,
        comprimento_cm: Number(row.comprimento_cm),
        largura_cm: Number(row.largura_cm),
        altura_cm: Number(row.altura_cm),
        peso_embalagem_kg: Number(row.peso_embalagem_kg),
      }));
    }

    if (!relProdRes.error && relProdRes.data) {
      produtosRelacionadosOpcoes = relProdRes.data as ProdutoRelacionadoOption[];
    }
  } catch (e) {
    configError = e instanceof Error ? e.message : "Erro ao carregar configuração.";
  }

  return {
    modelos,
    categorias,
    embalagens,
    produtosRelacionadosOpcoes,
    configError,
    loadError,
    modeloAnosLoadError,
    categoriasLoadError,
    embalagensLoadError,
  };
}
