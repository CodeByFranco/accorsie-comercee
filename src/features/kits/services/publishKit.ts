"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { KIT_STATUS_PUBLISHED, parseKitStatus } from "@/features/kits/utils/kitStatus";
import { parseKitDiscountType } from "@/features/kits/utils/kitPricing";
import { validateKitForPublish } from "@/features/kits/utils/validateKitForPublish";
import { createClient } from "@/services/supabase/server";
import { revalidatePath } from "next/cache";

export type PublishKitState =
  | { ok: true; message: string }
  | { ok: false; message: string; pending?: string[] };

export async function publishKit(kitId: string): Promise<PublishKitState> {
  await requireAdmin();
  const id = kitId.trim();
  if (!id) return { ok: false, message: "Kit não identificado." };

  const supabase = await createClient();
  const [{ data: kit, error }, { data: itemRows }] = await Promise.all([
    supabase
      .from("kits")
      .select("id, nome, slug, tipo_desconto, valor_desconto, preco_final, status")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("kit_items")
      .select("id, tipo, nome, kit_item_opcoes ( product_id )")
      .eq("kit_id", id),
  ]);

  if (error) return { ok: false, message: error.message };
  if (!kit) return { ok: false, message: "Kit não encontrado." };

  const validation = validateKitForPublish({
    nome: kit.nome,
    slug: kit.slug,
    tipo_desconto: parseKitDiscountType(kit.tipo_desconto),
    valor_desconto: Number(kit.valor_desconto),
    preco_final: kit.preco_final != null ? Number(kit.preco_final) : null,
    itemCount: itemRows?.length ?? 0,
    escolhas: (itemRows ?? [])
      .filter((r) => r.tipo === "escolha")
      .map((r) => ({
        nome: String(r.nome ?? ""),
        opcoesCount: Array.isArray(r.kit_item_opcoes) ? r.kit_item_opcoes.length : 0,
      })),
  });
  if (!validation.ok) {
    return { ok: false, message: validation.message, pending: validation.pending };
  }

  if (parseKitStatus(kit.status) === "published") {
    return { ok: true, message: "Kit já estava publicado." };
  }

  const { error: updErr } = await supabase
    .from("kits")
    .update({ status: KIT_STATUS_PUBLISHED })
    .eq("id", id);
  if (updErr) return { ok: false, message: updErr.message };

  revalidatePath("/");
  revalidatePath("/admin/kits");
  revalidatePath(`/admin/kits/${id}/edit`);
  if (kit.slug) revalidatePath(`/kit/${kit.slug}`);

  return { ok: true, message: "Kit publicado com sucesso." };
}
