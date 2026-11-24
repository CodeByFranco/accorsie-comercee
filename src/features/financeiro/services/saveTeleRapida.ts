"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createClient } from "@/services/supabase/server";

export type SaveTeleRapidaState = { ok: boolean; message: string };

export async function saveTeleRapida(
  _prev: SaveTeleRapidaState | null,
  formData: FormData,
): Promise<SaveTeleRapidaState> {
  await requireAdmin();

  const valor = Math.round(Number(String(formData.get("valor") ?? "").replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0 || valor > 1000) {
    return { ok: false, message: "Informe um valor entre R$ 0,01 e R$ 1.000,00." };
  }
  const ativa = formData.get("ativa") === "on";
  const horario = String(formData.get("horario_limite") ?? "").slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
    return { ok: false, message: "Informe um horário limite válido (HH:MM)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tele_rapida_config")
    .update({ valor, ativa, horario_limite: horario, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id");
  if (!error && (!data || data.length === 0)) {
    return { ok: false, message: "Configuração não encontrada. Aplique a migração da tele rápida no Supabase." };
  }
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/financeiro");
  return { ok: true, message: "Tele rápida salva." };
}
