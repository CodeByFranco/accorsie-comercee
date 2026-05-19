"use client";

import { useMemo, useState } from "react";
import type { MarcaOption } from "@/features/compatibilidade/components/ModeloForm";
import {
  ModelosListagemTabela,
  type ModeloListagemItem,
} from "@/features/compatibilidade/components/ModelosListagemTabela";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

function emptyListMessage(marcaId: string, termo: string): string {
  if (marcaId && termo) {
    return "Nenhum modelo com esse nome para a marca selecionada. Ajuste os filtros ou limpe-os.";
  }
  if (marcaId) {
    return "Nenhum modelo cadastrado para esta marca.";
  }
  return "Nenhum modelo com esse nome na lista. Ajuste o termo ou limpe o campo.";
}

export function ModelosListagemComBusca({
  items,
  marcas,
}: {
  items: ModeloListagemItem[];
  marcas: MarcaOption[];
}) {
  const [marcaId, setMarcaId] = useState("");
  const [nome, setNome] = useState("");
  const termo = nome.trim().toLocaleLowerCase("pt-BR");
  const hasFilters = Boolean(marcaId || termo);

  const filtrados = useMemo(() => {
    return items.filter((i) => {
      const matchMarca = !marcaId || i.marcaId === marcaId;
      const matchNome = !termo || i.nome.toLocaleLowerCase("pt-BR").includes(termo);
      return matchMarca && matchNome;
    });
  }, [items, marcaId, termo]);

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
              aria-label="Filtrar listagem pelo nome do modelo"
            />
          </label>
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {filtrados.length} de {items.length} modelo{items.length === 1 ? "" : "s"}
            </p>
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
          </div>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-gray-500">
          {emptyListMessage(marcaId, termo)}
        </p>
      ) : (
        <ModelosListagemTabela items={filtrados} marcas={marcas} />
      )}
    </div>
  );
}
