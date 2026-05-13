"use client";

import { useMemo, useState } from "react";
import type { MarcaOption } from "@/features/compatibilidade/components/ModeloForm";
import {
  ModelosListagemTabela,
  type ModeloListagemItem,
} from "@/features/compatibilidade/components/ModelosListagemTabela";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

export function ModelosListagemComBusca({
  items,
  marcas,
}: {
  items: ModeloListagemItem[];
  marcas: MarcaOption[];
}) {
  const [nome, setNome] = useState("");
  const termo = nome.trim().toLocaleLowerCase("pt-BR");

  const filtrados = useMemo(() => {
    if (!termo) return items;
    return items.filter((i) => i.nome.toLocaleLowerCase("pt-BR").includes(termo));
  }, [items, termo]);

  return (
    <div className="space-y-0">
      <div className="border-b border-gray-100 px-4 py-3">
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

      {filtrados.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-gray-500">
          Nenhum modelo com esse nome na lista. Ajuste o termo ou limpe o campo.
        </p>
      ) : (
        <ModelosListagemTabela items={filtrados} marcas={marcas} />
      )}
    </div>
  );
}
