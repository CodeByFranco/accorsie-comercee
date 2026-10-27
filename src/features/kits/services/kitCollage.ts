"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { KIT_STATUS_DRAFT } from "@/features/kits/utils/kitStatus";
import { buildKitCollage } from "@/features/kits/utils/buildKitCollage";
import { resolveProductImagePublicUrl } from "@/features/produtos/utils/resolveProductImagePublicUrl";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type GenerateKitCollageState =
  | { ok: true; url: string }
  | { ok: false; message: string };

function bucket() {
  return process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images";
}

function cleanIds(productIds: string[]): string[] {
  return [...new Set(productIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
}

/** Gera a montagem com as fotos dos produtos (na ordem recebida) e sobe em `kits/`. */
async function uploadCollageFor(
  supabase: ServerSupabase,
  productIds: string[],
): Promise<GenerateKitCollageState> {
  const { data, error } = await supabase.from("produtos").select("id, foto").in("id", productIds);
  if (error) return { ok: false, message: error.message };

  const fotoById = new Map((data ?? []).map((p) => [String(p.id), p.foto as string | null]));
  const urls = productIds
    .map((id) => resolveProductImagePublicUrl(fotoById.get(id)))
    .filter((u): u is string => Boolean(u));
  if (urls.length === 0) {
    return { ok: false, message: "Nenhum produto do kit tem foto para montar a imagem." };
  }

  const jpeg = await buildKitCollage(urls);
  if (!jpeg) return { ok: false, message: "Não foi possível carregar as fotos dos produtos." };

  const path = `kits/${crypto.randomUUID()}.jpg`;
  const { error: upErr } = await supabase.storage.from(bucket()).upload(path, jpeg, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (upErr) return { ok: false, message: `Falha ao enviar a montagem: ${upErr.message}` };

  return { ok: true, url: supabase.storage.from(bucket()).getPublicUrl(path).data.publicUrl };
}

/** Gera a montagem sem salvar no kit (o formulário grava ao salvar). */
export async function generateKitCollage(productIds: string[]): Promise<GenerateKitCollageState> {
  await requireAdmin();
  const ids = cleanIds(productIds);
  if (ids.length === 0) return { ok: false, message: "Adicione produtos ao kit primeiro." };
  return uploadCollageFor(await createClient(), ids);
}

/** Cria um kit em rascunho com os produtos selecionados na listagem e a montagem como foto. */
export async function createKitFromProducts(productIds: string[]): Promise<{ ok: false; message: string }> {
  await requireAdmin();
  const ids = cleanIds(productIds);
  if (ids.length === 0) return { ok: false, message: "Selecione ao menos um produto." };

  const supabase = await createClient();
  const { data: kit, error } = await supabase
    .from("kits")
    .insert({
      status: KIT_STATUS_DRAFT,
      tipo_desconto: "preco_fixo",
      valor_desconto: 0,
      preco_final: null,
      nome: null,
      slug: null,
    })
    .select("id")
    .single();
  if (error || !kit?.id) {
    return { ok: false, message: error?.message ?? "Não foi possível criar o kit." };
  }

  const { error: itemsErr } = await supabase
    .from("kit_items")
    .insert(ids.map((product_id) => ({ kit_id: kit.id, product_id, quantidade: 1 })));
  if (itemsErr) {
    await supabase.from("kits").delete().eq("id", kit.id);
    return { ok: false, message: `Não foi possível adicionar os produtos: ${itemsErr.message}` };
  }

  // Sem foto o kit continua criado; dá para gerar de novo na edição.
  const collage = await uploadCollageFor(supabase, ids);
  if (collage.ok) {
    await supabase.from("kits").update({ imagem: collage.url }).eq("id", kit.id);
  }

  revalidatePath("/admin/kits");
  redirect(`/admin/kits/${kit.id}/edit`);
}
