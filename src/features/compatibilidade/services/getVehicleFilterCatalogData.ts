import { normalizeTipoVeiculoModeloFromDb } from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import type { TipoVeiculoModelo } from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import { createClient } from "@/services/supabase/server";

export type VehicleFilterMarca = { id: string; nome: string };

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
  modelos: VehicleFilterModelo[];
  anosByModeloId: VehicleFilterAnosByModelo;
};

export async function getVehicleFilterCatalogData(): Promise<VehicleFilterCatalogData> {
  try {
    const supabase = await createClient();

    const [marcasRes, modelosRes, anosRes] = await Promise.all([
      supabase.from("marcas").select("id, nome").order("nome"),
      supabase.from("modelos").select("id, nome, marca_id, tipo_veiculo").order("nome"),
      supabase.from("modelo_anos").select("modelo_id, ano"),
    ]);

    if (process.env.NODE_ENV === "development") {
      if (marcasRes.error) console.error("[getVehicleFilterCatalogData] marcas", marcasRes.error);
      if (modelosRes.error) console.error("[getVehicleFilterCatalogData] modelos", modelosRes.error);
      if (anosRes.error) console.error("[getVehicleFilterCatalogData] modelo_anos", anosRes.error);
    }

    const marcas = (marcasRes.data ?? []) as VehicleFilterMarca[];
    const modelosRaw = modelosRes.data ?? [];
    const modelos: VehicleFilterModelo[] = modelosRaw.map((row) => ({
      id: row.id as string,
      nome: row.nome as string,
      marca_id: row.marca_id as string,
      tipo_veiculo: normalizeTipoVeiculoModeloFromDb((row as { tipo_veiculo?: unknown }).tipo_veiculo),
    }));

    const anosByModeloId: VehicleFilterAnosByModelo = {};
    for (const row of anosRes.data ?? []) {
      const modeloId = row.modelo_id as string;
      const ano = Number(row.ano);
      if (!modeloId || !Number.isFinite(ano)) continue;
      if (!anosByModeloId[modeloId]) anosByModeloId[modeloId] = [];
      anosByModeloId[modeloId].push(ano);
    }
    for (const id of Object.keys(anosByModeloId)) {
      anosByModeloId[id] = [...new Set(anosByModeloId[id])].sort((a, b) => b - a);
    }

    return { marcas, modelos, anosByModeloId };
  } catch {
    return { marcas: [], modelos: [], anosByModeloId: {} };
  }
}
