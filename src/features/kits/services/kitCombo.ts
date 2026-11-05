import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProduto, PRODUTO_FIELDS, type ProdutoEmbed } from "@/features/kits/utils/mapKitRow";
import type { KitCombo, KitDescontoPadrao, KitDetail, KitProductInfo } from "@/types/kit";

type ComboRow = {
  ativo: boolean | null;
  nome: string | null;
  qtd_min: number | null;
  qtd_padrao: number | null;
  qtd_max: number | null;
  kit_desconto_pix: number | string | null;
  kit_desconto_cartao: number | string | null;
  combo_desconto_pix: number | string | null;
  combo_desconto_cartao: number | string | null;
};

export const KIT_COMBO_SELECT =
  "ativo, nome, qtd_min, qtd_padrao, qtd_max, kit_desconto_pix, kit_desconto_cartao, combo_desconto_pix, combo_desconto_cartao";

const pct = (v: unknown) => Math.min(100, Math.max(0, Number(v) || 0));

export function mapDescontoPadrao(row: Partial<ComboRow> | null | undefined): KitDescontoPadrao {
  return {
    kit_pix: pct(row?.kit_desconto_pix ?? 12),
    kit_cartao: pct(row?.kit_desconto_cartao ?? 8),
    combo_pix: pct(row?.combo_desconto_pix ?? 20),
    combo_cartao: pct(row?.combo_desconto_cartao ?? 15),
  };
}

/** Adiciona o desconto padrão PIX/cartão e o combo (se o kit usa o padrão). */
export async function withKitCombo(supabase: SupabaseClient, kit: KitDetail): Promise<KitDetail> {
  try {
    const [kitRes, cfgRes, opcoesRes] = await Promise.all([
      supabase.from("kits").select("usa_desconto_padrao").eq("id", kit.id).maybeSingle(),
      supabase.from("kit_combo").select(KIT_COMBO_SELECT).eq("id", 1).maybeSingle(),
      supabase.from("kit_combo_opcoes").select(`product_id, produtos ( ${PRODUTO_FIELDS} )`),
    ]);
    if (kitRes.error || cfgRes.error) return kit;
    if (kitRes.data?.usa_desconto_padrao === false) return kit;

    const cfg = cfgRes.data as ComboRow | null;
    const descontoPadrao = mapDescontoPadrao(cfg);

    let combo: KitCombo | null = null;
    if (cfg?.ativo) {
      const opcoes = ((opcoesRes.data ?? []) as Array<{ produtos: ProdutoEmbed | ProdutoEmbed[] | null }>)
        .map((o) => mapProduto(o.produtos))
        .filter((p): p is KitProductInfo => p != null)
        .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
      if (opcoes.length > 0) {
        const qtd_min = Math.max(1, Number(cfg.qtd_min) || 1);
        const qtd_max = Math.max(qtd_min, Number(cfg.qtd_max) || qtd_min);
        combo = {
          nome: (cfg.nome ?? "").trim() || "Óleo do motor",
          qtd_min,
          qtd_max,
          qtd_padrao: Math.min(qtd_max, Math.max(qtd_min, Number(cfg.qtd_padrao) || qtd_min)),
          opcoes,
        };
      }
    }
    return { ...kit, combo, descontoPadrao };
  } catch {
    return kit;
  }
}
