"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarcaOption } from "@/features/compatibilidade/components/ModeloForm";
import {
  ModelosListagemTabela,
  type ModeloListagemItem,
} from "@/features/compatibilidade/components/ModelosListagemTabela";
import { listModelosAdmin } from "@/features/compatibilidade/services/modeloActions";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const SEARCH_DEBOUNCE_MS = 300;

function emptyListMessage(marcaId: string, termo: string, searching: boolean): string {
  if (searching) return "Buscando modelos…";
  if (marcaId && termo) {
    return "Nenhum modelo com esse nome para a marca selecionada. Ajuste os filtros ou limpe-os.";
  }
  if (marcaId) {
    return "Nenhum modelo cadastrado para esta marca.";
  }
  return "Nenhum modelo com esse nome no catálogo. Ajuste o termo ou limpe o campo.";
}

export function ModelosListagemComBusca({
  initialItems,
  catalogTotal,
  marcas,
}: {
  initialItems: ModeloListagemItem[];
  /** Total de modelos no banco (pode ser maior que initialItems.length antes da busca). */
  catalogTotal: number;
  marcas: MarcaOption[];
}) {
  const [marcaId, setMarcaId] = useState("");
  const [nome, setNome] = useState("");
  const [displayedItems, setDisplayedItems] = useState(initialItems);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const termo = nome.trim();
  const hasFilters = Boolean(marcaId || termo);

  useEffect(() => {
    setDisplayedItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!hasFilters) {
      setDisplayedItems(initialItems);
      setSearchError(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await listModelosAdmin({
          marcaId: marcaId || undefined,
          nome: termo || undefined,
        });
        if (!result.ok) {
          setSearchError(result.message);
          setDisplayedItems([]);
        } else {
          setDisplayedItems(result.items);
        }
        setSearching(false);
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [marcaId, termo, hasFilters, initialItems]);

  const counterLabel = useMemo(() => {
    if (searching) return "Buscando…";
    if (hasFilters) {
      return `${displayedItems.length} modelo${displayedItems.length === 1 ? "" : "s"} encontrado${displayedItems.length === 1 ? "" : "s"}`;
    }
    return `${displayedItems.length} de ${catalogTotal} modelo${catalogTotal === 1 ? "" : "s"} no catálogo`;
  }, [searching, hasFilters, displayedItems.length, catalogTotal]);

  return (
    <div className="space-y-0">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor="filtro_marca_modelo" className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Filtrar por marca
            </span>
            <select
              id="filtro_marca_modelo"
              value={marcaId}
              onChange={(e) => setMarcaId(e.target.value)}
              className={fieldClass}
              aria-label="Filtrar listagem pela marca"
            >
              <option value="">Todas as marcas</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="busca_nome_modelo" className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Buscar por nome do modelo
            </span>
            <input
              id="busca_nome_modelo"
              type="search"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Civic, Gol, Corolla"
              autoComplete="off"
              className={fieldClass}
              aria-label="Buscar no catálogo completo pelo nome do modelo"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">{counterLabel}</p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setMarcaId("");
                setNome("");
              }}
              className="text-xs font-medium text-admin-accent hover:underline"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

      </div>

      {searchError ? (
        <p className="px-4 py-4 text-xs text-red-700" role="alert">
          Erro na busca: {searchError}
        </p>
      ) : null}

      {!searchError && displayedItems.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-gray-500">
          {emptyListMessage(marcaId, termo, searching)}
        </p>
      ) : null}

      {!searchError && displayedItems.length > 0 ? (
        <ModelosListagemTabela items={displayedItems} marcas={marcas} />
      ) : null}
    </div>
  );
}
