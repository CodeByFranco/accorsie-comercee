"use client";

import { useMemo, useState } from "react";

export type ProdutoRelacionadoOption = {
  id: string;
  titulo: string;
  cod_produto: string;
};

type ProductRelacionadosFieldsetProps = {
  produtos: ProdutoRelacionadoOption[];
  /** Na edição, IDs já vinculados. */
  defaultSelectedIds?: string[];
};

export function ProductRelacionadosFieldset({
  produtos,
  defaultSelectedIds = [],
}: ProductRelacionadosFieldsetProps) {
  const [q, setQ] = useState("");
  const selectedSet = useMemo(() => new Set(defaultSelectedIds), [defaultSelectedIds]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return produtos;
    return produtos.filter(
      (p) =>
        p.titulo.toLowerCase().includes(t) ||
        p.cod_produto.toLowerCase().includes(t) ||
        p.id.toLowerCase().includes(t),
    );
  }, [produtos, q]);

  return (
    <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/40 p-4">
      <legend className="text-sm font-semibold text-gray-900">Produtos relacionados</legend>
      <p className="text-xs leading-relaxed text-gray-600">
        Opcional. Sem seleção, o site sugere automaticamente.
      </p>
      <label htmlFor="relacionados_busca" className="sr-only">
        Buscar na lista
      </label>
      <input
        id="relacionados_busca"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrar por título ou código…"
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20"
        autoComplete="off"
      />
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-100 bg-white p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-500">Nenhum produto corresponde à busca.</p>
        ) : (
          filtered.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                name="relacionado_id"
                value={p.id}
                defaultChecked={selectedSet.has(p.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
              />
              <span className="min-w-0">
                <span className="font-medium text-gray-900">{p.titulo}</span>
                <span className="block font-mono text-xs text-gray-500">{p.cod_produto}</span>
              </span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}
