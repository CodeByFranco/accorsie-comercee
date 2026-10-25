"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { publishProduct } from "@/features/produtos/services/publishProduct";
import { parseProductStatus, type ProductStatus } from "@/features/produtos/utils/productStatus";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";

export type BulkPhotoProduct = {
  id: string;
  titulo: string | null;
  cod_produto: string;
  status: ProductStatus;
  fotos: number;
};

/** Produtos com código, para casar com os nomes das imagens/pastas no navegador. */
export async function listProductsForBulkPhotos(): Promise<
  { ok: true; products: BulkPhotoProduct[] } | { ok: false; message: string }
> {
  await requireAdmin();
  const supabase = await createClient();

  const products: BulkPhotoProduct[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, titulo, cod_produto, status, produto_fotos(count)")
      .not("cod_produto", "is", null)
      .order("id")
      .range(from, from + 999);
    if (error) return { ok: false, message: error.message };

    for (const row of data ?? []) {
      const cod = String(row.cod_produto ?? "").trim();
      if (!cod) continue;
      const fotos = (row.produto_fotos as unknown as Array<{ count: number }> | null)?.[0]?.count ?? 0;
      products.push({
        id: row.id,
        titulo: row.titulo,
        cod_produto: cod,
        status: parseProductStatus(row.status),
        fotos: Number(fotos),
      });
    }
    if (!data || data.length < 1000) break;
  }

  return { ok: true, products };
}

export type AttachBulkPhotosResult =
  | { ok: true; published: boolean; message: string }
  | { ok: false; message: string };

/**
 * Adiciona as fotos (URLs já enviadas ao Storage) ao fim da galeria do produto.
 * Se o produto estiver em rascunho e `publish` for true, tenta publicar; campos
 * pendentes deixam o produto em rascunho e voltam na mensagem.
 */
export async function attachBulkPhotos(
  productId: string,
  urls: string[],
  publish: boolean
): Promise<AttachBulkPhotosResult> {
  await requireAdmin();
  const id = productId.trim();
  const fotos = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (!id) return { ok: false, message: "Produto não identificado." };
  if (fotos.length === 0) return { ok: false, message: "Nenhuma foto enviada." };

  const supabase = await createClient();
  const [{ data: produto, error: prodError }, { data: existentes, error: fotosError }] = await Promise.all([
    supabase.from("produtos").select("id, foto, status").eq("id", id).maybeSingle(),
    supabase.from("produto_fotos").select("ordem, is_principal").eq("produto_id", id),
  ]);
  if (prodError) return { ok: false, message: prodError.message };
  if (!produto) return { ok: false, message: "Produto não encontrado." };
  if (fotosError) return { ok: false, message: fotosError.message };

  const temPrincipal = (existentes ?? []).some((f) => f.is_principal);
  const proximaOrdem = (existentes ?? []).reduce((max, f) => Math.max(max, Number(f.ordem) + 1), 0);

  const { error: insertError } = await supabase.from("produto_fotos").insert(
    fotos.map((foto, idx) => ({
      produto_id: id,
      foto,
      ordem: proximaOrdem + idx,
      is_principal: !temPrincipal && idx === 0,
    }))
  );
  if (insertError) return { ok: false, message: `Fotos não salvas: ${insertError.message}` };

  if (!temPrincipal || !String(produto.foto ?? "").trim()) {
    const { error } = await supabase.from("produtos").update({ foto: fotos[0] }).eq("id", id);
    if (error) return { ok: false, message: `Fotos salvas, mas a foto principal falhou: ${error.message}` };
  }

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${id}/edit`);

  const status = parseProductStatus(produto.status);
  if (!publish || status === "published") {
    return {
      ok: true,
      published: status === "published",
      message: `${fotos.length} foto(s) adicionada(s).`,
    };
  }

  const pub = await publishProduct(id);
  if (!pub.ok) {
    return {
      ok: true,
      published: false,
      message: `${fotos.length} foto(s) adicionada(s); continua em rascunho. ${pub.message}`,
    };
  }
  return { ok: true, published: true, message: `${fotos.length} foto(s) adicionada(s) e produto publicado.` };
}
