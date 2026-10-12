"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { VehicleFilterModelo } from "@/features/compatibilidade/services/getVehicleFilterCatalogData";
import { getModelosDaMarca } from "@/features/compatibilidade/services/getModeloAnos";

type ModelosPorMarca = Record<string, VehicleFilterModelo[]>;

function groupByMarca(modelos: VehicleFilterModelo[]): ModelosPorMarca {
  const out: ModelosPorMarca = {};
  for (const m of modelos) (out[m.marca_id] ??= []).push(m);
  return out;
}

/**
 * Cache client-side de modelos por marca. O servidor hidrata só a marca do modelo aplicado
 * (`initialModelos`); as demais são buscadas sob demanda quando a marca é escolhida.
 */
export function useModelosPorMarca(initialModelos: VehicleFilterModelo[]) {
  const doServidor = useMemo(() => groupByMarca(initialModelos), [initialModelos]);
  const [carregados, setCarregados] = useState<ModelosPorMarca>({});
  const [loadingMarcaIds, setLoadingMarcaIds] = useState<ReadonlySet<string>>(() => new Set());
  /** Requisições por marca (concluídas ou em andamento) — chamadas repetidas reaproveitam a mesma. */
  const requestsRef = useRef<Map<string, Promise<VehicleFilterModelo[]>>>(new Map());

  const porMarca = useMemo(() => ({ ...carregados, ...doServidor }), [carregados, doServidor]);

  const carregarMarca = useCallback(
    (marcaId: string): Promise<VehicleFilterModelo[]> => {
      const id = marcaId.trim();
      if (!id) return Promise.resolve([]);
      if (doServidor[id]) return Promise.resolve(doServidor[id]);
      const existing = requestsRef.current.get(id);
      if (existing) return existing;

      setLoadingMarcaIds((prev) => new Set(prev).add(id));
      const request = getModelosDaMarca(id)
        .then((modelos) => {
          setCarregados((prev) => ({ ...prev, [id]: modelos }));
          return modelos;
        })
        .catch(() => {
          requestsRef.current.delete(id);
          return [] as VehicleFilterModelo[];
        })
        .finally(() => {
          setLoadingMarcaIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
      requestsRef.current.set(id, request);
      return request;
    },
    [doServidor]
  );

  const findModelo = useCallback(
    (modeloId: string | null | undefined) => {
      if (!modeloId) return undefined;
      for (const lista of Object.values(porMarca)) {
        const found = lista.find((m) => m.id === modeloId);
        if (found) return found;
      }
      return undefined;
    },
    [porMarca]
  );

  return { porMarca, loadingMarcaIds, carregarMarca, findModelo };
}
