import { createPublicClient } from "@/services/supabase/public";
import { KIT_STATUS_PUBLISHED } from "@/features/kits/utils/kitStatus";
import { KIT_LIST_SELECT, mapKitSummary, type KitRowWithItems } from "@/features/kits/utils/mapKitRow";
import type { KitSummary } from "@/types/kit";

export async function getHomeKits(limit = 8): Promise<KitSummary[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("kits")
      .select(KIT_LIST_SELECT)
      .eq("status", KIT_STATUS_PUBLISHED)
      .order("nome")
      .limit(limit);
    if (error || !data) return [];
    return (data as KitRowWithItems[])
      .map((row) => mapKitSummary(row))
      .filter((k): k is KitSummary => k != null && k.itemCount > 0);
  } catch {
    return [];
  }
}

export async function searchPublishedKits(term: string, limit = 12): Promise<KitSummary[]> {
  const q = term.trim().replace(/[%_]/g, "").slice(0, 80);
  if (!q) return [];
  try {
    const supabase = createPublicClient();
    const pattern = `%${q}%`;
    const [byNome, bySlug] = await Promise.all([
      supabase
        .from("kits")
        .select(KIT_LIST_SELECT)
        .eq("status", KIT_STATUS_PUBLISHED)
        .ilike("nome", pattern)
        .order("nome")
        .limit(limit),
      supabase
        .from("kits")
        .select(KIT_LIST_SELECT)
        .eq("status", KIT_STATUS_PUBLISHED)
        .ilike("slug", pattern)
        .order("nome")
        .limit(limit),
    ]);
    const map = new Map<string, KitSummary>();
    for (const row of [...(byNome.data ?? []), ...(bySlug.data ?? [])] as KitRowWithItems[]) {
      const summary = mapKitSummary(row);
      if (summary && summary.itemCount > 0) map.set(summary.id, summary);
    }
    return [...map.values()].slice(0, limit);
  } catch {
    return [];
  }
}
