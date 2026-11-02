import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";
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

/** Prévia do admin: qualquer status (RLS libera rascunhos só para admin). */
export async function getKitByIdForAdmin(id: string): Promise<KitDetail | null> {
  const kitId = id.trim();
  if (!kitId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("kits").select(KIT_DETAIL_SELECT).eq("id", kitId).maybeSingle();
  if (error || !data) return null;
  return mapKitDetail({ ...(data as KitRowWithItems), slug: (data as KitRowWithItems).slug || kitId, nome: (data as KitRowWithItems).nome || "Kit sem nome" });
}
