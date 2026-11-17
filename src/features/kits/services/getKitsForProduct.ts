import { createPublicClient } from "@/services/supabase/public";
import { KIT_STATUS_PUBLISHED } from "@/features/kits/utils/kitStatus";
import { KIT_LIST_SELECT, mapKitSummary, selectKits, type KitRowWithItems } from "@/features/kits/utils/mapKitRow";
import type { KitSummary } from "@/types/kit";

export async function getKitsForProduct(productId: string): Promise<KitSummary[]> {
  const id = productId.trim();
  if (!id) return [];
  try {
    const supabase = createPublicClient();
    const [{ data: links, error: linkErr }, { data: optLinks }] = await Promise.all([
      supabase.from("kit_items").select("kit_id").eq("product_id", id),
      supabase.from("kit_item_opcoes").select("kit_items ( kit_id )").eq("product_id", id),
    ]);
    if (linkErr) return [];

    const optKitIds = (optLinks ?? []).flatMap((r) => {
      const ki = (r as { kit_items: { kit_id: string } | { kit_id: string }[] | null }).kit_items;
      return (Array.isArray(ki) ? ki : ki ? [ki] : []).map((x) => x.kit_id);
    });
    const kitIds = [...new Set([...(links ?? []).map((r) => r.kit_id as string), ...optKitIds].filter(Boolean))];
    if (kitIds.length === 0) return [];

    const { data, error } = await selectKits(
      (columns) =>
        supabase.from("kits").select(columns).in("id", kitIds).eq("status", KIT_STATUS_PUBLISHED).order("nome"),
      KIT_LIST_SELECT,
    );
    if (error || !data) return [];
    return (data as KitRowWithItems[])
      .map((row) => mapKitSummary(row))
      .filter((k): k is KitSummary => k != null && k.itemCount > 0);
  } catch {
    return [];
  }
}
