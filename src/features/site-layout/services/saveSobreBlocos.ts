"use server";

import { revalidatePath, updateTag } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { parseSobreBlocos } from "@/features/site-layout/utils/sobreBlocos";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";

export type SaveSobreBlocosResult = { ok: boolean; message: string };

/** `blocosJson = null` restaura o layout padrão. */
export async function saveSobreBlocos(blocosJson: string | null): Promise<SaveSobreBlocosResult> {
  await requireAdmin();

  let value: unknown = null;
  if (blocosJson !== null) {
    try {
      value = parseSobreBlocos(JSON.parse(blocosJson));
    } catch {
      return { ok: false, message: "Dados inválidos." };
    }
    if (!value) return { ok: false, message: "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_layout")
    .update({ sobre_blocos: value, updated_at: new Date().toISOString() })
    .eq("id", "default");

  if (error) {
    const hint = error.message.includes("column")
      ? " Rode a migração `20261118130000_site_layout_sobre_blocos` no Supabase."
      : "";
    return { ok: false, message: `${error.message}${hint}` };
  }

  updateTag(CATALOG_CACHE_TAGS.siteLayout);
  revalidatePath("/sobre");
  revalidatePath("/admin/layout/sobre");

  return { ok: true, message: blocosJson === null ? "Layout padrão restaurado." : "Página Sobre publicada." };
}
