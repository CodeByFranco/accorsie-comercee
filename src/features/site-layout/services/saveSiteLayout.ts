"use server";

import { revalidatePath, updateTag } from "next/cache";

import { patchSiteLayoutBanners } from "@/features/site-layout/services/querySiteLayout";
import { SITE_HOME_BANNER_COUNT } from "@/features/site-layout/utils/homeBannerUrls";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createClient } from "@/services/supabase/server";

export type SaveSiteLayoutState =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function saveSiteLayout(
  _prev: SaveSiteLayoutState | null,
  formData: FormData
): Promise<SaveSiteLayoutState> {
  await requireAdmin();
  const updated_at = new Date().toISOString();
  const patch = {
    banner_1_url: "",
    banner_2_url: "",
    banner_3_url: "",
    banner_4_url: "",
    banner_5_url: "",
    banner_6_url: "",
    updated_at,
  };
  for (let i = 1; i <= SITE_HOME_BANNER_COUNT; i++) {
    const key = `banner_${i}_url` as keyof typeof patch;
    patch[key] = String(formData.get(key) ?? "").trim();
  }

  const supabase = await createClient();
  const { error } = await patchSiteLayoutBanners(supabase, patch);

  if (error) {
    return { ok: false, message: error };
  }

  updateTag(CATALOG_CACHE_TAGS.siteLayout);
  revalidatePath("/");
  revalidatePath("/admin/layout");

  return { ok: true, message: "Layout do site salvo." };
}
