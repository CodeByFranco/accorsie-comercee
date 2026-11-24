"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";

export type SaveCashbackState = { ok: boolean; message: string };

const MODOS = ["livre", "sempre", "teto", "a_cada_n"];

function num(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").replace(",", "."));
}

export async function saveCashback(_prev: SaveCashbackState | null, formData: FormData): Promise<SaveCashbackState> {
  await requireAdmin();

  const percentual = Math.round(num(formData.get("percentual")) * 100) / 100;
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 50) {
    return { ok: false, message: "Informe um percentual entre 0 e 50." };
  }
  const modo = String(formData.get("modo") ?? "");
  if (!MODOS.includes(modo)) return { ok: false, message: "Escolha uma regra de uso." };

  const tetoValor = Math.round(num(formData.get("teto_valor")) * 100) / 100;
  if (!Number.isFinite(tetoValor) || tetoValor <= 0 || tetoValor > 100000) {
    return { ok: false, message: "Informe um valor máximo de saldo maior que zero." };
  }
  const aCadaN = Math.floor(num(formData.get("a_cada_n")));
  if (!Number.isInteger(aCadaN) || aCadaN < 1 || aCadaN > 100) {
    return { ok: false, message: "Informe o número de compras entre 1 e 100." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cashback_config")
    .update({ percentual, modo, teto_valor: tetoValor, a_cada_n: aCadaN, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) {
    return { ok: false, message: "Configuração não encontrada. Aplique a migração do cashback no Supabase." };
  }

  revalidatePath("/admin/financeiro");
  return { ok: true, message: "Cashback salvo." };
}
