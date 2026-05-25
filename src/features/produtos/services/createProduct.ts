"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { assertCompatUsaAnosCadastrados } from "@/features/compatibilidade/utils/assertCompatModeloAnos";
import { parseCompatibilidadesJson } from "@/features/compatibilidade/utils/compatibilidadesForm";
import { fetchValidCategoriaIds, parseCategoriaIdsFromFormData } from "@/features/categorias/utils/productCategoriasForm";
import { parseOptionalDimension } from "@/features/produtos/utils/parseOptionalDimension";
import {
  parseProductFormPercent,
  parseRelacionadoIdsFromForm,
} from "@/features/produtos/utils/productFormParsers";
import { resolveEmbalagemId } from "@/features/produtos/utils/resolveEmbalagemId";
import {
  isHtmlDescriptionEmpty,
  sanitizeProductDescriptionHtml,
} from "@/features/produtos/utils/sanitizeProductDescription";
import { parseProductPhotoGalleryFromForm } from "@/features/produtos/services/productPhotoGalleryForm";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";

export type CreateProductState =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function createProduct(
  _prev: CreateProductState | null,
  formData: FormData
): Promise<CreateProductState> {
  await requireAdmin();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const cod_produto = String(formData.get("cod_produto") ?? "").trim();
  const descricaoRaw = String(formData.get("descricao") ?? "").trim();
  const descricaoSan = sanitizeProductDescriptionHtml(descricaoRaw);
  const descricao =
    descricaoSan && !isHtmlDescriptionEmpty(descricaoSan) ? descricaoSan : null;
  const valorRaw = String(formData.get("valor") ?? "").replace(",", ".");
  const galleryParsed = parseProductPhotoGalleryFromForm(formData);
  if (!galleryParsed.ok) {
    return { ok: false, message: galleryParsed.message };
  }
  const foto = galleryParsed.principalFoto;
  const em_destaque = formData.get("em_destaque") === "on";
  const somente_retirada_loja = formData.get("somente_retirada_loja") === "on";
  const quantidadeRaw = String(formData.get("quantidade_estoque") ?? "").trim();
  const compatJson = String(formData.get("compat_json") ?? "");
  const compat_all_modelos = String(formData.get("compat_all_modelos") ?? "") === "1";
  const categoriaIdsRequested = parseCategoriaIdsFromFormData(formData);
  const embalagemRaw = String(formData.get("embalagem_id") ?? "");
  const pc = parseOptionalDimension(String(formData.get("prod_comprimento_cm") ?? ""));
  const pl = parseOptionalDimension(String(formData.get("prod_largura_cm") ?? ""));
  const pa = parseOptionalDimension(String(formData.get("prod_altura_cm") ?? ""));
  const pp = parseOptionalDimension(String(formData.get("prod_peso_kg") ?? ""));
  const desconto_pix_percent = parseProductFormPercent(formData.get("desconto_pix_percent"));
  const desconto_cartao_percent = parseProductFormPercent(formData.get("desconto_cartao_percent"));
  if (pc === undefined || pl === undefined || pa === undefined || pp === undefined) {
    return {
      ok: false,
      message: "Dimensões e peso do produto precisam ser números válidos (≥ 0) ou ficar em branco.",
    };
  }
  if (pc === null || pl === null || pa === null || pp === null) {
    return {
      ok: false,
      message:
        "Antes de salvar, preencha as dimensões obrigatórias do produto (comprimento, largura, altura e peso).",
    };
  }

  if (!titulo) return { ok: false, message: "Faltou o título. Preencha e tente de novo." };
  if (!cod_produto) {
    return { ok: false, message: "Faltou o código do produto. Ele identifica o item no sistema." };
  }

  const valor = Number.parseFloat(valorRaw);
  if (Number.isNaN(valor) || valor < 0) {
    return { ok: false, message: "O valor em reais não está válido. Use números iguais ou acima de zero." };
  }

  const quantidade_estoque = Number.parseInt(quantidadeRaw, 10);
  if (Number.isNaN(quantidade_estoque) || quantidade_estoque < 0) {
    return { ok: false, message: "A quantidade em estoque precisa ser um número inteiro maior ou igual a zero." };
  }

  const compatParsed = parseCompatibilidadesJson(compatJson);
  if (!compatParsed.ok) {
    return { ok: false, message: compatParsed.message };
  }
  const compatRows = compatParsed.rows;

  const supabase = await createClient();

  const embalagem_id = await resolveEmbalagemId(supabase, embalagemRaw);

  if (!compat_all_modelos) {
    const anosOk = await assertCompatUsaAnosCadastrados(supabase, compatRows);
    if (!anosOk.ok) {
      return { ok: false, message: anosOk.message };
    }
  }

  const { data: produto, error: prodError } = await supabase
    .from("produtos")
    .insert({
      titulo,
      cod_produto,
      descricao,
      valor,
      foto,
      quantidade_estoque,
      em_destaque,
      prod_comprimento_cm: pc,
      prod_largura_cm: pl,
      prod_altura_cm: pa,
      prod_peso_kg: pp,
      embalagem_id,
      desconto_pix_percent,
      desconto_cartao_percent,
      compat_todos_modelos: compat_all_modelos,
      somente_retirada_loja,
    })
    .select("id")
    .single();

  if (prodError) {
    if (prodError.code === "23505") {
      return {
        ok: false,
        message: "Já existe um produto com este código. Escolha outro código ou edite o cadastro existente no painel.",
      };
    }
    return {
      ok: false,
      message: `Não foi possível salvar: ${prodError.message}. Tente de novo ou volte ao painel.`,
    };
  }

  if (galleryParsed.photos.length > 0) {
    const { error: photosError } = await supabase.from("produto_fotos").insert(
      galleryParsed.photos.map((photo) => ({
        produto_id: produto.id,
        foto: photo.foto,
        ordem: photo.ordem,
        is_principal: photo.is_principal,
      }))
    );
    if (photosError) {
      return {
        ok: false,
        message: `O produto foi criado, mas a galeria de fotos não pôde ser salva: ${photosError.message}. Você pode editar o produto no painel para ajustar.`,
      };
    }
  }

  if (!compat_all_modelos && compatRows.length > 0) {
    const { error: compError } = await supabase.from("produto_compatibilidades").insert(
      compatRows.map((r) => ({
        produto_id: produto.id,
        modelo_id: r.modelo_id,
        ano_inicio: r.ano_inicio,
        ano_fim: r.ano_fim,
      }))
    );

    if (compError) {
      return {
        ok: false,
        message: `O produto foi criado, mas a compatibilidade não pôde ser salva: ${compError.message}. Você pode editar o produto no painel para ajustar.`,
      };
    }
  }

  const categoriaIds = await fetchValidCategoriaIds(supabase, categoriaIdsRequested);
  if (categoriaIds.length > 0) {
    const { error: catError } = await supabase.from("produto_categorias").insert(
      categoriaIds.map((categoria_id) => ({ produto_id: produto.id, categoria_id }))
    );
    if (catError) {
      return {
        ok: false,
        message: `O produto foi criado, mas as categorias não puderam ser salvas: ${catError.message}. Edite o produto para vincular de novo.`,
      };
    }
  }

  const relacionadoIds = parseRelacionadoIdsFromForm(formData);
  if (relacionadoIds.length > 0) {
    const { error: relError } = await supabase.from("produto_relacionados").insert(
      relacionadoIds.map((relacionado_id) => ({ produto_id: produto.id, relacionado_id }))
    );
    if (relError) {
      return {
        ok: false,
        message: `O produto foi criado, mas os relacionados não puderam ser salvos: ${relError.message}. Edite o produto para ajustar.`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/produtos/novo");
  revalidatePath(`/produtos/${produto.id}`);
  return {
    ok: true,
    message: "Sucesso ao cadastrar produto!",
  };
}
