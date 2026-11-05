import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProduto, PRODUTO_FIELDS, type ProdutoEmbed } from "@/features/kits/utils/mapKitRow";
import type { KitCombo, KitDetail, KitProductInfo } from "@/types/kit";

type ComboRow = {
  ativo: boolean | null;
  nome: string | null;
  qtd_min: number | null;
  qtd_padrao: number | null;
  qtd_max: number | null;
  desconto_percent: number | string | null;
  categoria_id: string | null;
};

/** Combo global para um kit (null se inativo, sem opções ou de outra categoria). */
export async function getKitComboFor(
  supabase: SupabaseClient,
  kitCategoriaId: string | null,
): Promise<KitCombo | null> {
  try {
    const [cfgRes, opcoesRes] = await Promise.all([
      supabase
        .from("kit_combo")
        .select("ativo, nome, qtd_min, qtd_padrao, qtd_max, desconto_percent, categoria_id")
        .eq("id", 1)
        .maybeSingle(),
      supabase.from("kit_combo_opcoes").select(`product_id, produtos ( ${PRODUTO_FIELDS} )`),
    ]);
    const cfg = cfgRes.data as ComboRow | null;
    if (!cfg?.ativo) return null;
    if (cfg.categoria_id && cfg.categoria_id !== kitCategoriaId) return null;
    const opcoes = ((opcoesRes.data ?? []) as Array<{ produtos: ProdutoEmbed | ProdutoEmbed[] | null }>)
      .map((o) => mapProduto(o.produtos))
      .filter((p): p is KitProductInfo => p != null)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    if (opcoes.length === 0) return null;
    const qtd_min = Math.max(1, Number(cfg.qtd_min) || 1);
    const qtd_max = Math.max(qtd_min, Number(cfg.qtd_max) || qtd_min);
    return {
      nome: (cfg.nome ?? "").trim() || "Óleo do motor",
      qtd_min,
      qtd_max,
      qtd_padrao: Math.min(qtd_max, Math.max(qtd_min, Number(cfg.qtd_padrao) || qtd_min)),
      desconto_percent: Math.min(100, Math.max(0, Number(cfg.desconto_percent) || 0)),
      opcoes,
    };
  } catch {
    return null;
  }
}

export async function withKitCombo(supabase: SupabaseClient, kit: KitDetail): Promise<KitDetail> {
  return { ...kit, combo: await getKitComboFor(supabase, kit.categoria?.id ?? null) };
}
