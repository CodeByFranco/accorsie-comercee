"use server";

import { revalidatePath, updateTag } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { clearLojaPublicaCache } from "@/lib/siteLojaPublica";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";

export type SetSiteLojaPublicaState =
  | { ok: true; lojaPublica: boolean; message: string }
  | { ok: false; message: string };

export async function setSiteLojaPublica(lojaPublica: boolean): Promise<SetSiteLojaPublicaState> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_layout")
    .update({
      loja_publica: lojaPublica,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  if (error) {
    const hint =
      error.message.includes("loja_publica") || error.message.includes("column")
        ? " Rode a migração `20261117140000_site_layout_loja_publica` no Supabase."
        : "";
    return { ok: false, message: `${error.message}${hint}` };
  }

  clearLojaPublicaCache();
  updateTag(CATALOG_CACHE_TAGS.siteLayout);
  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    lojaPublica,
    message: lojaPublica ? "Loja ativa para visitantes." : "Loja em manutenção (visitantes veem «em construção»).",
  };
}