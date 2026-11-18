import type { SupabaseClient } from "@supabase/supabase-js";

import { emptySiteLayoutRow, parseSiteLayoutRow } from "@/features/site-layout/utils/homeBannerUrls";
import type { SiteLayoutRow } from "@/types/siteLayout";

const SELECT_FULL =
  "id, banner_1_url, banner_2_url, banner_3_url, banner_4_url, banner_5_url, banner_6_url, loja_publica, updated_at";

/** Funciona mesmo se as colunas dos banners 3–6 ainda não existirem no Supabase. */
const SELECT_FALLBACKS = [
  "id, banner_1_url, banner_2_url, banner_3_url, banner_4_url, banner_5_url, banner_6_url, updated_at",
  "id, banner_1_url, banner_2_url, loja_publica, updated_at",
  "id, banner_1_url, banner_2_url, updated_at",
] as const;

/** Erro típico quando a migração dos 6 banners ainda não foi aplicada. */
export function isMissingSiteLayoutColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("column") || m.includes("does not exist") || m.includes("banner_3");
}

/** `strict`: lança em erro em vez de devolver vazio (para não gravar falha em cache). */
export async function querySiteLayout(
  client: SupabaseClient,
  options?: { strict?: boolean },
): Promise<SiteLayoutRow> {
  const empty = emptySiteLayoutRow();
  const attempts = [SELECT_FULL, ...SELECT_FALLBACKS];

  for (const select of attempts) {
    const { data, error } = await client.from("site_layout").select(select).eq("id", "default").maybeSingle();
    if (!error && data) {
      return parseSiteLayoutRow(data as Partial<SiteLayoutRow>);
    }
    if (error && !isMissingSiteLayoutColumnError(error.message)) {
      if (options?.strict) throw new Error(error.message);
      return empty;
    }
  }

  if (options?.strict) throw new Error("site_layout: linha 'default' não encontrada.");
  return empty;
}

export type SiteLayoutBannerPatch = {
  banner_1_url: string;
  banner_2_url: string;
  banner_3_url: string;
  banner_4_url: string;
  banner_5_url: string;
  banner_6_url: string;
  updated_at: string;
};

export async function patchSiteLayoutBanners(
  client: SupabaseClient,
  patch: SiteLayoutBannerPatch,
): Promise<{ error: string | null }> {
  const full = await client.from("site_layout").update(patch).eq("id", "default");
  if (!full.error) return { error: null };
  if (!isMissingSiteLayoutColumnError(full.error.message)) {
    return { error: full.error.message };
  }

  const legacy = await client
    .from("site_layout")
    .update({
      banner_1_url: patch.banner_1_url,
      banner_2_url: patch.banner_2_url,
      updated_at: patch.updated_at,
    })
    .eq("id", "default");

  return { error: legacy.error?.message ?? null };
}