"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";
import type { KitComboConfig } from "@/types/kit";

export type SaveKitComboState = { ok: boolean; message: string } | null;

export async function saveKitCombo(_prev: SaveKitComboState, formData: FormData): Promise<SaveKitComboState> {
  await requireAdmin();
  let cfg: KitComboConfig;
  try {
    cfg = JSON.parse(String(formData.get("combo_json") ?? "")) as KitComboConfig;
  } catch {
    return { ok: false, message: "Dados do combo inválidos." };
  }

  const nome = String(cfg.nome ?? "").trim() || "Óleo do motor";
  const qtd_min = Math.max(1, Math.floor(Number(cfg.qtd_min)) || 1);
  const qtd_max = Math.max(qtd_min, Math.floor(Number(cfg.qtd_max)) || qtd_min);
  const qtd_padrao = Math.min(qtd_max, Math.max(qtd_min, Math.floor(Number(cfg.qtd_padrao)) || qtd_min));
  const desconto_percent = Math.min(100, Math.max(0, Number(cfg.desconto_percent) || 0));
  const product_ids = [...new Set((cfg.product_ids ?? []).map((id) => String(id).trim()).filter(Boolean))];
  const ativo = cfg.ativo === true;

  if (ativo && product_ids.length === 0) {
    return { ok: false, message: "Selecione ao menos um produto para ativar o combo." };
  }

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from("kit_combo")
    .update({
      ativo,
      nome,
      qtd_min,
      qtd_max,
      qtd_padrao,
      desconto_percent,
      categoria_id: cfg.categoria_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (upErr) return { ok: false, message: upErr.message };

  const { data: atuais, error: listErr } = await supabase.from("kit_combo_opcoes").select("product_id");
  if (listErr) return { ok: false, message: listErr.message };
  const atuaisSet = new Set((atuais ?? []).map((r) => r.product_id as string));
  const novosSet = new Set(product_ids);
  const remover = [...atuaisSet].filter((id) => !novosSet.has(id));
  const inserir = product_ids.filter((id) => !atuaisSet.has(id));

  if (remover.length > 0) {
    const { error } = await supabase.from("kit_combo_opcoes").delete().in("product_id", remover);
    if (error) return { ok: false, message: error.message };
  }
  if (inserir.length > 0) {
    const { error } = await supabase.from("kit_combo_opcoes").insert(inserir.map((product_id) => ({ product_id })));
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/kit", "layout");
  revalidatePath("/admin/kits/combo");
  return { ok: true, message: ativo ? "Combo salvo e ativo nos kits." : "Combo salvo (desativado)." };
}
