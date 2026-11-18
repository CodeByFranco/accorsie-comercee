"use server";

import { revalidatePath, updateTag } from "next/cache";

import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";

export type SaveSiteInstitucionalState = { ok: boolean; message: string };

export async function saveSiteInstitucional(
  _prev: SaveSiteInstitucionalState | null,
  formData: FormData,
): Promise<SaveSiteInstitucionalState> {
  await requireAdmin();

  const manifesto = String(formData.get("manifesto_texto") ?? "").replace(/\r\n/g, "\n").trim();
  const horarios = String(formData.get("horarios_texto") ?? "").replace(/\r\n/g, "\n").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_layout")
    .update({
      manifesto_texto: manifesto || null,
      horarios_texto: horarios || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  if (error) {
    const hint = error.message.includes("column")
      ? " Rode a migração `20261118120000_site_layout_institucional` no Supabase."
      : "";
    return { ok: false, message: `${error.message}${hint}` };
  }

  updateTag(CATALOG_CACHE_TAGS.siteLayout);
  revalidatePath("/", "layout");
  revalidatePath("/admin/layout");

  return { ok: true, message: "Textos institucionais salvos." };
}
