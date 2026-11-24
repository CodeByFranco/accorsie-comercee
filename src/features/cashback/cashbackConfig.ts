import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";

import { CASHBACK_PADRAO, type CashbackConfig, type CashbackModo } from "@/features/cashback/cashbackRegras";

export { CASHBACK_PADRAO, descreverRegraCashback, formatPercentual } from "@/features/cashback/cashbackRegras";
export type { CashbackConfig, CashbackModo } from "@/features/cashback/cashbackRegras";

const MODOS: CashbackModo[] = ["livre", "sempre", "teto", "a_cada_n"];

function mapRow(data: unknown): CashbackConfig | null {
  if (!data || typeof data !== "object") return null;
  const row = data as { percentual?: unknown; modo?: unknown; teto_valor?: unknown; a_cada_n?: unknown };
  const percentual = Number(row.percentual);
  if (!Number.isFinite(percentual) || percentual < 0) return null;
  const modo = MODOS.includes(row.modo as CashbackModo) ? (row.modo as CashbackModo) : "livre";
  const tetoValor = Number(row.teto_valor);
  const aCadaN = Number(row.a_cada_n);
  return {
    percentual,
    modo,
    tetoValor: Number.isFinite(tetoValor) && tetoValor > 0 ? tetoValor : CASHBACK_PADRAO.tetoValor,
    aCadaN: Number.isInteger(aCadaN) && aCadaN >= 1 ? aCadaN : CASHBACK_PADRAO.aCadaN,
  };
}

const COLS = "percentual, modo, teto_valor, a_cada_n";

export async function getCashbackConfig(): Promise<CashbackConfig> {
  try {
    const { data, error } = await createPublicClient().from("cashback_config").select(COLS).eq("id", 1).maybeSingle();
    if (error || !data) return CASHBACK_PADRAO;
    return mapRow(data) ?? CASHBACK_PADRAO;
  } catch {
    return CASHBACK_PADRAO;
  }
}

export async function getCashbackConfigAdmin(): Promise<{ config: CashbackConfig; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("cashback_config").select(COLS).eq("id", 1).maybeSingle();
    if (error) return { config: CASHBACK_PADRAO, error: error.message };
    return { config: mapRow(data) ?? CASHBACK_PADRAO, error: null };
  } catch (e) {
    return { config: CASHBACK_PADRAO, error: e instanceof Error ? e.message : "Erro ao carregar." };
  }
}
