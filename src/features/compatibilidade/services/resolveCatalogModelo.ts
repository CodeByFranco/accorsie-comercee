import {
  getCachedAnosDoModelo,
  getCachedModelosDaMarca,
  getVehicleFilterCatalogData,
} from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import { rankMarcasCandidatas, rankModelos } from "@/features/compatibilidade/utils/matchCatalogModelo";

/** Quantos melhores candidatos testar contra o ano antes de cair no primeiro. */
const TOP_CANDIDATOS_ANO = 5;

/** Acha o `modelos.id` do catálogo para marca/modelo/ano vindos da consulta de placa. */
export async function resolveCatalogModeloId(input: {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
}): Promise<string | null> {
  if (!input.modelo) return null;
  const { marcas } = await getVehicleFilterCatalogData();
  const candidatas = rankMarcasCandidatas(marcas, input.marca);
  if (candidatas.length === 0) return null;

  const marcaNameById = new Map(marcas.map((m) => [m.id, m.nome]));
  const modelos = (await Promise.all(candidatas.map((m) => getCachedModelosDaMarca(m.id)))).flat();
  const ranked = rankModelos(modelos, marcaNameById, input.modelo, input.marca);
  if (ranked.length === 0) return null;

  if (input.ano != null) {
    for (const c of ranked.slice(0, TOP_CANDIDATOS_ANO)) {
      const anos = await getCachedAnosDoModelo(c.modelo.id);
      if (anos.includes(input.ano)) return c.modelo.id;
    }
  }
  return ranked[0].modelo.id;
}
