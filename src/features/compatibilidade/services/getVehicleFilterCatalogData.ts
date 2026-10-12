import { cache } from "react";
import { unstable_cache } from "next/cache";

import {
  normalizeTipoVeiculoModeloFromDb,
  TIPOS_VEICULO_MODELO,
} from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import type { TipoVeiculoModelo } from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import { CATALOG_CACHE_TAGS } from "@/features/produtos/utils/catalogCacheTags";
import { createPublicClient } from "@/services/supabase/public";

/** `tipos`: tipos de veículo que a marca possui no catálogo (para filtrar marcas por aba). */
export type VehicleFilterMarca = { id: string; nome: string; tipos?: TipoVeiculoModelo[] };

export type VehicleFilterModelo = {
  id: string;
  nome: string;
  marca_id: string;
  tipo_veiculo: TipoVeiculoModelo;
};

/** Anos cadastrados por modelo (`modelo_anos`), ordenados do mais novo ao mais antigo. */
export type VehicleFilterAnosByModelo = Record<string, number[]>;

export type VehicleFilterCatalogData = {
  marcas: VehicleFilterMarca[];
  /** Parcial: só os modelos da marca do modelo já aplicado (URL). Demais marcas vêm sob demanda. */
  modelos: VehicleFilterModelo[];
  /** Parcial: só modelos já hidratados (ex.: da URL). Demais anos vêm sob demanda. */
  anosByModeloId: VehicleFilterAnosByModelo;
};

/** PostgREST devolve no máximo 1000 linhas por requisição. */
const PAGE_SIZE = 1000;
/**
 * Catálogo de veículos muda raramente; mutações no admin invalidam pela tag.
 * 1h cobre `ensureModeloAnosCadastrados`, que não invalida de propósito (evita remount do form).
 */
const VEHICLE_CACHE_SECONDS = 60 * 60;

async function fetchMarcasComTipos(): Promise<VehicleFilterMarca[]> {
  try {
    const supabase = createPublicClient();
    const { data: marcasRows, error } = await supabase.from("marcas").select("id, nome").order("nome");
    if (error || !marcasRows) return [];

    const tiposPorMarca = new Map<string, Set<TipoVeiculoModelo>>();
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error: modErr } = await supabase
        .from("modelos")
        .select("marca_id, tipo_veiculo")
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (modErr || !data) break;
      for (const row of data) {
        const marcaId = row.marca_id as string;
        const set = tiposPorMarca.get(marcaId) ?? new Set<TipoVeiculoModelo>();
        set.add(normalizeTipoVeiculoModeloFromDb(row.tipo_veiculo));
        tiposPorMarca.set(marcaId, set);
      }
      if (data.length < PAGE_SIZE) break;
    }

    return marcasRows
      .filter((m) => tiposPorMarca.has(m.id as string))
      .map((m) => {
        const tipos = tiposPorMarca.get(m.id as string)!;
        return {
          id: m.id as string,
          nome: m.nome as string,
          tipos: TIPOS_VEICULO_MODELO.filter((t) => tipos.has(t)),
        };
      });
  } catch {
    return [];
  }
}

const getCachedMarcasComTipos = unstable_cache(fetchMarcasComTipos, ["vehicle-filter-marcas-tipos"], {
  tags: [CATALOG_CACHE_TAGS.vehicleFilter],
  revalidate: VEHICLE_CACHE_SECONDS,
});

async function fetchModelosDaMarca(marcaId: string): Promise<VehicleFilterModelo[]> {
  try {
    const supabase = createPublicClient();
    const modelos: VehicleFilterModelo[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("modelos")
        .select("id, nome, marca_id, tipo_veiculo")
        .eq("marca_id", marcaId)
        .order("nome")
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data) break;
      for (const row of data) {
        modelos.push({
          id: row.id as string,
          nome: row.nome as string,
          marca_id: row.marca_id as string,
          tipo_veiculo: normalizeTipoVeiculoModeloFromDb(row.tipo_veiculo),
        });
      }
      if (data.length < PAGE_SIZE) break;
    }
    return modelos;
  } catch {
    return [];
  }
}

/** Modelos de uma marca (cache por marca). */
export const getCachedModelosDaMarca = cache(function getCachedModelosDaMarca(marcaId: string) {
  return unstable_cache(() => fetchModelosDaMarca(marcaId), ["vehicle-filter-modelos-marca", marcaId], {
    tags: [CATALOG_CACHE_TAGS.vehicleFilter],
    revalidate: VEHICLE_CACHE_SECONDS,
  })();
});

async function fetchAnosForModelo(modeloId: string): Promise<number[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("modelo_anos")
      .select("ano")
      .eq("modelo_id", modeloId)
      .order("ano", { ascending: false });
    if (error || !data?.length) return [];
    return [
      ...new Set(
        data
          .map((r) => Number(r.ano))
          .filter((n) => Number.isFinite(n) && n >= 1900 && n <= 2100)
      ),
    ].sort((a, b) => b - a);
  } catch {
    return [];
  }
}

/** Anos de um modelo (cache por modelo). */
export const getCachedAnosDoModelo = cache(function getCachedAnosDoModelo(modeloId: string) {
  return unstable_cache(() => fetchAnosForModelo(modeloId), ["vehicle-filter-anos-modelo", modeloId], {
    tags: [CATALOG_CACHE_TAGS.vehicleFilter],
    revalidate: VEHICLE_CACHE_SECONDS,
  })();
});

async function fetchMarcaIdDoModelo(modeloId: string): Promise<string | null> {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.from("modelos").select("marca_id").eq("id", modeloId).maybeSingle();
    return (data?.marca_id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

const getCachedMarcaIdDoModelo = (modeloId: string) =>
  unstable_cache(() => fetchMarcaIdDoModelo(modeloId), ["vehicle-filter-marca-do-modelo", modeloId], {
    tags: [CATALOG_CACHE_TAGS.vehicleFilter],
    revalidate: VEHICLE_CACHE_SECONDS,
  })();

/**
 * Catálogo do filtro por veículo: marcas (com tipos) sempre; modelos e anos só do modelo
 * já aplicado na URL (`modeloIdForAnos`). Demais marcas/anos são buscados sob demanda no client.
 */
export const getVehicleFilterCatalogData = cache(async function getVehicleFilterCatalogData(opts?: {
  modeloIdForAnos?: string | null;
}): Promise<VehicleFilterCatalogData> {
  const modeloId = opts?.modeloIdForAnos?.trim() || null;
  const [marcas, marcaIdAplicada, anos] = await Promise.all([
    getCachedMarcasComTipos(),
    modeloId ? getCachedMarcaIdDoModelo(modeloId) : Promise.resolve(null),
    modeloId ? getCachedAnosDoModelo(modeloId) : Promise.resolve(null),
  ]);

  const modelos = marcaIdAplicada ? await getCachedModelosDaMarca(marcaIdAplicada) : [];
  const anosByModeloId: VehicleFilterAnosByModelo = {};
  if (modeloId && anos) anosByModeloId[modeloId] = anos;

  return { marcas, modelos, anosByModeloId };
});
