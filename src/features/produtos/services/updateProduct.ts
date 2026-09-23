"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  assertCompatUsaAnosCadastrados,
  type MissingModeloAno,
} from "@/features/compatibilidade/utils/assertCompatModeloAnos";
import { parseCompatibilidadesJson } from "@/features/compatibilidade/utils/compatibilidadesForm";
import { fetchValidCategoriaIds, parseCategoriaIdsFromFormData } from "@/features/categorias/utils/productCategoriasForm";
import { parseOptionalDimension } from "@/features/produtos/utils/parseOptionalDimension";
import {
  parseProductFormPercent,
  parseRelacionadoIdsFromForm,
} from "@/features/produtos/utils/productFormParsers";
import { parseProductStatus } from "@/features/produtos/utils/productStatus";
import { resolveEmbalagemId } from "@/features/produtos/utils/resolveEmbalagemId";
import {
  isHtmlDescriptionEmpty,
  sanitizeProductDescriptionHtml,
} from "@/features/produtos/utils/sanitizeProductDescription";
import { validateProductForPublish } from "@/features/produtos/utils/validateProductForPublish";
import { parseProductPhotoGalleryFromForm } from "@/features/produtos/services/productPhotoGalleryForm";
import { createClient } from "@/services/supabase/server";
import { removeProductImageFromStorage } from "@/services/storage/removeProductImage";
import { revalidatePath } from "next/cache";
import { revalidateStoreCatalogCache } from "@/features/produtos/utils/catalogCacheTags";

export type UpdateProductState =
  | { ok: true; message: string }
  | { ok: false; message: string; missingModeloAnos?: MissingModeloAno[] };

export async function updateProduct(
  _prev: UpdateProductState | null,
  formData: FormData
): Promise<UpdateProductState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Produto não identificado." };

  const tituloRaw = String(formData.get("titulo") ?? "").trim();
  const codRaw = String(formData.get("cod_produto") ?? "").trim();
  const titulo = tituloRaw || null;
  const cod_produto = codRaw || null;
  const descricaoRaw = String(formData.get("descricao") ?? "").trim();
  const descricaoSan = sanitizeProductDescriptionHtml(descricaoRaw);
  const descricao =
    descricaoSan && !isHtmlDescriptionEmpty(descricaoSan) ? descricaoSan : null;
  const valorRaw = String(formData.get("valor") ?? "").replace(",", ".").trim();
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
    return { ok: false, message: "Dimensões e peso do produto inválidos (use números ≥ 0 ou vazio)." };
  }

  let valor: number | null = null;
  if (valorRaw) {
    const parsed = Number.parseFloat(valorRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { ok: false, message: "Valor inválido." };
    }
    valor = parsed;
  }

  let quantidade_estoque = 0;
  if (quantidadeRaw) {
    quantidade_estoque = Number.parseInt(quantidadeRaw, 10);
    if (Number.isNaN(quantidade_estoque) || quantidade_estoque < 0) {
      return { ok: false, message: "Quantidade em estoque inválida." };
    }
  }

  const compatParsed = parseCompatibilidadesJson(compatJson);
  if (!compatParsed.ok) {
    return { ok: false, message: compatParsed.message };
  }
  const compatRows = compatParsed.rows;

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("produtos")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (existingError) return { ok: false, message: existingError.message };
  if (!existing) return { ok: false, message: "Produto não encontrado." };

  const status = parseProductStatus(existing.status);
  const isPublished = status === "published";

  if (isPublished) {
    const validation = validateProductForPublish({
      titulo,
      cod_produto,
      valor,
      quantidade_estoque,
      prod_comprimento_cm: pc,
      prod_largura_cm: pl,
      prod_altura_cm: pa,
      prod_peso_kg: pp,
    });
    if (!validation.ok) {
      return {
        ok: false,
        message: `Produto publicado: preencha todos os campos obrigatórios antes de salvar. Pendentes: ${validation.pending.join(", ")}.`,
      };
    }
  }

  const embalagem_id = await resolveEmbalagemId(supabase, embalagemRaw);

  const [{ data: before }, { data: beforePhotos }] = await Promise.all([
    supabase.from("produtos").select("foto").eq("id", id).maybeSingle(),
    supabase.from("produto_fotos").select("foto").eq("produto_id", id),
  ]);

  const { error: prodError } = await supabase
    .from("produtos")
    .update({
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
    .eq("id", id);

  if (prodError) {
    if (prodError.code === "23505") {
      return { ok: false, message: "Já existe outro produto com este código." };
    }
    return { ok: false, message: prodError.message };
  }

  const { error: delPhotosError } = await supabase.from("produto_fotos").delete().eq("produto_id", id);
  if (delPhotosError) {
    return {
      ok: false,
      message: `Dados salvos, mas ao atualizar galeria de fotos: ${delPhotosError.message}`,
    };
  }

  if (galleryParsed.photos.length > 0) {
    const { error: photosError } = await supabase.from("produto_fotos").insert(
      galleryParsed.photos.map((photo) => ({
        produto_id: id,
        foto: photo.foto,
        ordem: photo.ordem,
        is_principal: photo.is_principal,
      }))
    );
    if (photosError) {
      return {
        ok: false,
        message: `Produto atualizado, mas a galeria de fotos falhou: ${photosError.message}`,
      };
    }
  }

  const previousRefs = new Set<string>();
  if (before?.foto) previousRefs.add(before.foto);
  for (const row of beforePhotos ?? []) {
    if (row.foto) previousRefs.add(row.foto);
  }
  const nextRefs = new Set(galleryParsed.photos.map((photo) => photo.foto));
  for (const ref of previousRefs) {
    if (!nextRefs.has(ref)) {
      await removeProductImageFromStorage(ref);
    }
  }

  const { error: delCatError } = await supabase.from("produto_categorias").delete().eq("produto_id", id);
  if (delCatError) {
    return {
      ok: false,
      message: `Dados salvos, mas ao atualizar categorias: ${delCatError.message}`,
    };
  }

  const categoriaIds = await fetchValidCategoriaIds(supabase, categoriaIdsRequested);
  if (categoriaIds.length > 0) {
    const { error: catError } = await supabase.from("produto_categorias").insert(
      categoriaIds.map((categoria_id) => ({ produto_id: id, categoria_id }))
    );
    if (catError) {
      return {
        ok: false,
        message: `Produto atualizado, mas categorias falharam: ${catError.message}`,
      };
    }
  }

  const relacionadoIds = parseRelacionadoIdsFromForm(formData, id);
  const { error: delRelError } = await supabase.from("produto_relacionados").delete().eq("produto_id", id);
  if (delRelError) {
    return {
      ok: false,
      message: `Produto atualizado, mas ao atualizar relacionados: ${delRelError.message}`,
    };
  }
  if (relacionadoIds.length > 0) {
    const { error: relError } = await supabase.from("produto_relacionados").insert(
      relacionadoIds.map((relacionado_id) => ({ produto_id: id, relacionado_id }))
    );
    if (relError) {
      return {
        ok: false,
        message: `Produto atualizado, mas relacionados falharam: ${relError.message}`,
      };
    }
  }

  // Compatibilidade por último: se faltar ano de referência, o restante (código, título, etc.) já ficou salvo.
  if (!compat_all_modelos) {
    const anosOk = await assertCompatUsaAnosCadastrados(supabase, compatRows);
    if (!anosOk.ok) {
      revalidatePath(`/admin/produtos/${id}/edit`);
      revalidatePath("/admin/produtos");
      return {
        ok: false,
        message: `${anosOk.message} Os demais dados do produto (código, título, etc.) já foram salvos.`,
        ...(anosOk.missingAnos?.length ? { missingModeloAnos: anosOk.missingAnos } : {}),
      };
    }
  }

  const { error: delCompError } = await supabase
    .from("produto_compatibilidades")
    .delete()
    .eq("produto_id", id);

  if (delCompError) {
    return {
      ok: false,
      message: `Dados salvos, mas ao atualizar compatibilidade: ${delCompError.message}`,
    };
  }

  if (!compat_all_modelos && compatRows.length > 0) {
    const { error: compError } = await supabase.from("produto_compatibilidades").insert(
      compatRows.map((r) => ({
        produto_id: id,
        modelo_id: r.modelo_id,
        ano_inicio: r.ano_inicio,
        ano_fim: r.ano_fim,
      }))
    );

    if (compError) {
      return {
        ok: false,
        message: `Produto atualizado, mas compatibilidade falhou: ${compError.message}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}/edit`);
  revalidatePath(`/produtos/${id}`);
  revalidateStoreCatalogCache();
  return { ok: true, message: "Produto atualizado com sucesso." };
}
