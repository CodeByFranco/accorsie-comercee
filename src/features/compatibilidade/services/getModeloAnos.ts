"use server";

import {
  getCachedAnosDoModelo,
  getCachedModelosDaMarca,
  type VehicleFilterModelo,
} from "@/features/compatibilidade/services/getVehicleFilterCatalogData";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Anos cadastrados para um modelo (mais novos primeiro). Usado no filtro veicular sob demanda. */
export async function getModeloAnos(modeloId: string): Promise<number[]> {
  const id = modeloId.trim();
  if (!id || !UUID_RE.test(id)) return [];
  return getCachedAnosDoModelo(id);
}

/** Modelos de uma marca. Usado no filtro veicular sob demanda (evita enviar o catálogo inteiro). */
export async function getModelosDaMarca(marcaId: string): Promise<VehicleFilterModelo[]> {
  const id = marcaId.trim();
  if (!id || !UUID_RE.test(id)) return [];
  return getCachedModelosDaMarca(id);
}
