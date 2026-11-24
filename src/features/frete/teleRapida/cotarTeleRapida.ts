import { getStorePickupAddress } from "@/config/storePickupAddress";
import { lookupCep } from "@/features/endereco/services/lookupCep";
import type { MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";

import { normalizarCidade, TELE_RAPIDA_ID } from "./teleRapida";
import { dentroDoHorarioTeleRapida, getTeleRapidaConfig } from "./teleRapidaConfig";

/**
 * Opção de tele rápida quando o CEP de destino é da mesma cidade/UF da loja.
 * A cidade vem da consulta de CEP no servidor (nunca do navegador).
 */
export async function cotarTeleRapida(cepDestino: string): Promise<MelhorEnvioQuoteOption | null> {
  const loja = getStorePickupAddress();
  if (!loja) return null;

  const config = await getTeleRapidaConfig();
  if (!config.ativa || !dentroDoHorarioTeleRapida(config)) return null;

  let destino;
  try {
    destino = await lookupCep(cepDestino, AbortSignal.timeout(5000));
  } catch {
    return null;
  }
  if (!destino) return null;
  if (destino.uf !== loja.uf || normalizarCidade(destino.cidade) !== normalizarCidade(loja.cidade)) {
    return null;
  }

  return {
    id: TELE_RAPIDA_ID,
    nome: "Tele rápida",
    precoCentavos: Math.round(config.valor * 100),
    horarioLimite: config.horarioLimite,
  };
}
