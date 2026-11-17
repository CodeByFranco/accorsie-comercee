import type { SiteLayoutRow } from "@/types/siteLayout";

export const SITE_HOME_BANNER_COUNT = 6;

export const SITE_HOME_BANNER_FIELDS = [
  "banner_1_url",
  "banner_2_url",
  "banner_3_url",
  "banner_4_url",
  "banner_5_url",
  "banner_6_url",
] as const satisfies readonly (keyof SiteLayoutRow)[];

export function homeBannerUrlsFromSiteLayout(row: SiteLayoutRow): string[] {
  return siteLayoutBannerUrlsFromRow(row);
}

/** URLs dos slots (vitrine ignora vazios; admin com `keepEmpty` mantém os 6 para o formulário). */
export function siteLayoutBannerUrlsFromRow(
  row: SiteLayoutRow,
  options?: { keepEmpty?: boolean }
): string[] {
  const urls = SITE_HOME_BANNER_FIELDS.map((key) => (row[key] ?? "").trim());
  return options?.keepEmpty ? urls : urls.filter(Boolean);
}

export function parseSiteLayoutRow(data: Partial<SiteLayoutRow> | null | undefined): SiteLayoutRow {
  const empty = emptySiteLayoutRow();
  if (!data) return empty;
  return {
    ...empty,
    ...data,
    banner_1_url: data.banner_1_url ?? "",
    banner_2_url: data.banner_2_url ?? "",
    banner_3_url: data.banner_3_url ?? "",
    banner_4_url: data.banner_4_url ?? "",
    banner_5_url: data.banner_5_url ?? "",
    banner_6_url: data.banner_6_url ?? "",
    loja_publica: data.loja_publica ?? true,
    id: data.id ?? empty.id,
    updated_at: data.updated_at ?? empty.updated_at,
  };
}

export function emptySiteLayoutRow(): SiteLayoutRow {
  return {
    id: "default",
    banner_1_url: "",
    banner_2_url: "",
    banner_3_url: "",
    banner_4_url: "",
    banner_5_url: "",
    banner_6_url: "",
    loja_publica: true,
    updated_at: new Date(0).toISOString(),
  };
}