import { createPublicClient } from "@/services/supabase/public";
import { createClient } from "@/services/supabase/server";

/** horarioLimite no formato "HH:MM" (horário de Brasília). */
export type TeleRapidaConfig = { ativa: boolean; valor: number; horarioLimite: string };

export const TELE_RAPIDA_PADRAO: TeleRapidaConfig = { ativa: true, valor: 12, horarioLimite: "15:00" };

function mapRow(data: unknown): TeleRapidaConfig | null {
  if (!data || typeof data !== "object") return null;
  const row = data as { ativa?: unknown; valor?: unknown; horario_limite?: unknown };
  const valor = Number(row.valor);
  if (!Number.isFinite(valor) || valor < 0) return null;
  const h = typeof row.horario_limite === "string" ? row.horario_limite.slice(0, 5) : "";
  return { ativa: row.ativa === true, valor, horarioLimite: /^\d{2}:\d{2}$/.test(h) ? h : TELE_RAPIDA_PADRAO.horarioLimite };
}

/** Leitura pública (sem cache: o valor precisa bater na cotação e na revalidação do checkout). */
export async function getTeleRapidaConfig(): Promise<TeleRapidaConfig> {
  try {
    const { data, error } = await createPublicClient()
      .from("tele_rapida_config")
      .select("ativa, valor, horario_limite")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return TELE_RAPIDA_PADRAO;
    return mapRow(data) ?? TELE_RAPIDA_PADRAO;
  } catch {
    return TELE_RAPIDA_PADRAO;
  }
}

export async function getTeleRapidaConfigAdmin(): Promise<{ config: TeleRapidaConfig; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tele_rapida_config")
      .select("ativa, valor, horario_limite")
      .eq("id", 1)
      .maybeSingle();
    if (error) return { config: TELE_RAPIDA_PADRAO, error: error.message };
    return { config: mapRow(data) ?? TELE_RAPIDA_PADRAO, error: null };
  } catch (e) {
    return { config: TELE_RAPIDA_PADRAO, error: e instanceof Error ? e.message : "Erro ao carregar." };
  }
}

/** Hora atual em Brasília ("HH:MM"). */
export function horaAgoraBrasilia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function dentroDoHorarioTeleRapida(config: TeleRapidaConfig, now: Date = new Date()): boolean {
  return horaAgoraBrasilia(now) < config.horarioLimite;
}
