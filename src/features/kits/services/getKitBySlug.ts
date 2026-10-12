import { createPublicClient } from "@/services/supabase/public";
import { KIT_STATUS_PUBLISHED } from "@/features/kits/utils/kitStatus";
import { KIT_DETAIL_SELECT, mapKitDetail, type KitRowWithItems } from "@/features/kits/utils/mapKitRow";
import type { KitDetail } from "@/types/kit";

export async function getKitBySlug(slug: string): Promise<KitDetail | null> {
  const s = slug.trim();
  if (!s) return null;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("kits")
      .select(KIT_DETAIL_SELECT)
      .eq("slug", s)
      .eq("status", KIT_STATUS_PUBLISHED)
      .maybeSingle();
    if (error || !data) return null;
    const detail = mapKitDetail(data as KitRowWithItems);
    if (!detail || detail.items.length === 0) return null;
    return detail;
  } catch {
    return null;
  }
}
