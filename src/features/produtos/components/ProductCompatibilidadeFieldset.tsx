"use client";

import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";
import {
  TIPO_VEICULO_MODELO_LABELS,
  type TipoVeiculoModelo,
} from "@/features/compatibilidade/constants/tipoVeiculoModelo";
import {
  faixasFromCompatStrings,
  faixasParaAnos,
  sortedUniqueInts,
} from "@/features/compatibilidade/utils/compatAnosRanges";

export type ModeloOption = {
  id: string;
  nome: string;
  marca_nome: string;
  tipo_veiculo: TipoVeiculoModelo;
  /** Anos cadastrados em «Marcas e modelos» (modelo_anos), ordenados. */
  anos_referencia: number[];
};

export type CompatRowState = {
  key: string;
  modelo_id: string;
  anos_selecionados: number[];
};

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyRow(): CompatRowState {
  return { key: newKey(), modelo_id: "", anos_selecionados: [] };
}

function todosAnosDoModelo(modelosById: Map<string, ModeloOption>, modeloId: string): number[] {
  return modelosById.get(modeloId)?.anos_referencia ?? [];
}

function normalizeRow(row: CompatRowState): CompatRowState {
  return {
    key: row.key,
    modelo_id: row.modelo_id ?? "",
    anos_selecionados: sortedUniqueInts(row.anos_selecionados ?? []),
  };
}

export function rowsToCompatJson(rows: CompatRowState[]): string {
  const payload = rows.map(({ modelo_id, anos_selecionados }) => ({
    modelo_id: modelo_id.trim(),
    anos_selecionados: sortedUniqueInts(anos_selecionados ?? []),
  }));
  return JSON.stringify(payload);
}

/** Agrupa várias faixas do servidor em uma linha por modelo (checkboxes). */
export function compatRowsFromServer(
  list: { modelo_id: string; ano_inicio: string; ano_fim: string }[]
): CompatRowState[] {
  if (list.length === 0) return [emptyRow()];

  const byModelo = new Map<string, number[]>();
  for (const r of list) {
    if (!r.modelo_id) continue;
    const anos = faixasParaAnos(faixasFromCompatStrings([r]));
    const prev = byModelo.get(r.modelo_id) ?? [];
    byModelo.set(r.modelo_id, sortedUniqueInts([...prev, ...anos]));
  }

  const rows = [...byModelo.entries()].map(([modelo_id, anos_selecionados]) => ({
    key: newKey(),
    modelo_id,
    anos_selecionados,
  }));

  return rows.length > 0 ? rows : [emptyRow()];
}

function AnosCheckboxGrid({
  anosCatalog,
  selecionados,
  disabled,
  onChange,
}: {
  anosCatalog: number[];
  selecionados: Set<number>;
  disabled?: boolean;
  onChange: (next: number[]) => void;
}) {
  if (anosCatalog.length === 0) return null;

  function toggle(ano: number) {
    const next = new Set(selecionados);
    if (next.has(ano)) next.delete(ano);
    else next.add(ano);
    onChange(sortedUniqueInts([...next]));
  }

  function marcarTodos(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange([...anosCatalog]);
  }

  function desmarcarTodos(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-700">Anos compatíveis</span>
        <button
          type="button"
          disabled={disabled}
          onClick={marcarTodos}
          className="text-xs font-medium text-admin-accent hover:underline disabled:opacity-50"
        >
          Marcar todos
        </button>
        <span className="text-gray-300">·</span>
        <button
          type="button"
          disabled={disabled}
          onClick={desmarcarTodos}
          className="text-xs font-medium text-gray-600 hover:underline disabled:opacity-50"
        >
          Desmarcar todos
        </button>
        <span className="text-xs text-gray-500">
          ({selecionados.size}/{anosCatalog.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Anos selecionados">
        {anosCatalog.map((ano) => {
          const checked = selecionados.has(ano);
          return (
            <button
              key={ano}
              type="button"
              disabled={disabled}
              aria-pressed={checked}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(ano);
              }}
              className={`inline-flex cursor-pointer items-center rounded-md border px-2 py-1 text-xs font-medium transition ${
                checked
                  ? "border-admin-accent/40 bg-[#1d63ed]/10 text-gray-900"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              } disabled:pointer-events-none disabled:opacity-50`}
            >
              {ano}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AnosLateralLista({ anos }: { anos: number[] }) {
  if (anos.length === 0) {
    return <span className="shrink-0 text-xs text-amber-700">Sem anos</span>;
  }
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-0.5 max-w-[9rem] sm:max-w-[12rem]">
      {anos.map((y) => (
        <span
          key={y}
          className="rounded bg-gray-200/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-700"
        >
          {y}
        </span>
      ))}
    </span>
  );
}

export function ProductCompatibilidadeFieldset({
  modelos,
  initialRows,
  initialAllModelos,
  replaceOnSave,
}: {
  modelos: ModeloOption[];
  initialRows?: { modelo_id: string; ano_inicio: string; ano_fim: string }[];
  initialAllModelos?: boolean;
  replaceOnSave?: boolean;
}) {
  const [rows, setRows] = useState<CompatRowState[]>(() =>
    initialRows && initialRows.length > 0 ? compatRowsFromServer(initialRows) : [emptyRow()]
  );

  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);
  const [pickerChecked, setPickerChecked] = useState<Set<string>>(() => new Set());
  const [allModelos, setAllModelos] = useState(Boolean(initialAllModelos));

  const modelosById = useMemo(() => new Map(modelos.map((m) => [m.id, m])), [modelos]);

  const compatJson = useMemo(() => rowsToCompatJson(rows), [rows]);

  const existingModeloIds = useMemo(
    () => new Set(rows.map((r) => r.modelo_id).filter(Boolean)),
    [rows]
  );

  const modelosFiltradosPicker = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return modelos;
    return modelos.filter((m) => {
      const tipo = TIPO_VEICULO_MODELO_LABELS[m.tipo_veiculo];
      const hay = `${m.nome} ${m.marca_nome} ${tipo}`.toLowerCase();
      return hay.includes(q);
    });
  }, [modelos, pickerQuery]);

  function togglePickerId(id: string) {
    setPickerChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarTodosFiltrados() {
    setPickerChecked((prev) => {
      const next = new Set(prev);
      for (const m of modelosFiltradosPicker) {
        if (!existingModeloIds.has(m.id)) next.add(m.id);
      }
      return next;
    });
  }

  function limparSelecaoPicker() {
    setPickerChecked(new Set());
  }

  function adicionarModelosSelecionados() {
    const ids = [...pickerChecked].filter((id) => modelosById.has(id) && !existingModeloIds.has(id));
    if (ids.length === 0) {
      setPickerChecked(new Set());
      return;
    }
    const novasLinhas: CompatRowState[] = ids.map((modelo_id) => ({
      key: newKey(),
      modelo_id,
      anos_selecionados: [...todosAnosDoModelo(modelosById, modelo_id)],
    }));

    setRows((prev) => {
      const isOnlyBlank =
        prev.length === 1 && !prev[0].modelo_id && (prev[0].anos_selecionados ?? []).length === 0;
      if (isOnlyBlank) return novasLinhas.map(normalizeRow);
      return [...prev.map(normalizeRow), ...novasLinhas.map(normalizeRow)];
    });
    setPickerChecked(new Set());
  }

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((r) => {
      const next = r.filter((x) => x.key !== key);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  function patchRow(key: string, patch: Partial<Omit<CompatRowState, "key">>) {
    setRows((r) =>
      r.map((row) => (row.key === key ? normalizeRow({ ...row, ...patch }) : normalizeRow(row)))
    );
  }

  return (
    <fieldset className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
      <legend className="px-1 text-sm font-medium text-gray-800">Compatibilidade (opcional)</legend>
      <p className="mb-3 text-xs text-gray-500">
        Para cada modelo, marque os anos em que a peça se aplica (somente anos cadastrados em{" "}
        <Link href="/admin/marcas-e-modelos" className="font-medium text-admin-accent hover:underline">
          Marcas e modelos
        </Link>
        ). Ao adicionar um modelo, todos os anos dele vêm selecionados; desmarque os que não se aplicam.
      </p>
      {replaceOnSave && (
        <p className="mb-3 text-xs text-gray-600">
          Ao salvar, esta lista substitui toda a compatibilidade já cadastrada. Para remover todas, deixe
          apenas linhas em branco.
        </p>
      )}
      <label className="mb-4 flex items-start gap-2 rounded-lg border border-admin-accent/25 bg-white/80 p-3 text-sm text-gray-800">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-gray-300"
          checked={allModelos}
          onChange={(e) => setAllModelos(e.target.checked)}
        />
        <span>
          <span className="font-semibold text-gray-900">
            Compatível com todos os modelos (inclusive os novos cadastrados futuramente)
          </span>
          <span className="mt-1 block text-xs text-gray-600">
            Quando ativo, este produto aparece para qualquer veículo selecionado no filtro.
          </span>
        </span>
      </label>

      <div
        className={`mb-4 rounded-lg border border-admin-accent/25 bg-white/90 p-3 shadow-sm ${
          allModelos ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-gray-900"
          aria-expanded={pickerOpen}
        >
          <span>Adicionar vários modelos</span>
          <span className="text-xs font-normal text-gray-500">{pickerOpen ? "Ocultar" : "Mostrar"}</span>
        </button>
        {pickerOpen && (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">
              Pesquise por nome, marca ou tipo. À direita de cada modelo aparecem os anos cadastrados.
              Ao adicionar, todos esses anos são vinculados; ajuste na lista abaixo se precisar.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="compat-picker-busca" className="mb-1 block text-xs font-medium text-gray-700">
                  Buscar modelos
                </label>
                <input
                  id="compat-picker-busca"
                  type="search"
                  autoComplete="off"
                  placeholder="Ex.: Civic, Gol, Sprinter…"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  className={fieldClass + " w-full"}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selecionarTodosFiltrados}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
                >
                  Selecionar visíveis
                </button>
                <button
                  type="button"
                  onClick={limparSelecaoPicker}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
                >
                  Limpar seleção
                </button>
              </div>
            </div>
            <div
              className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-2"
              role="group"
              aria-label="Modelos para seleção em massa"
            >
              {modelosFiltradosPicker.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-gray-500">Nenhum modelo com esse termo.</p>
              ) : (
                <ul className="space-y-1">
                  {modelosFiltradosPicker.map((m) => {
                    const jaNaLista = existingModeloIds.has(m.id);
                    const marcado = pickerChecked.has(m.id);
                    return (
                      <li key={`pick-${m.id}`}>
                        <div className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                          jaNaLista ? "text-gray-400" : "hover:bg-white"
                        }`}>
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-0.5 shrink-0 rounded border-gray-300"
                              checked={marcado}
                              disabled={jaNaLista}
                              onChange={() => togglePickerId(m.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900">{m.marca_nome}</span>
                              <span className="text-gray-600"> — {m.nome}</span>
                              <span className="text-gray-500">
                                {" "}
                                · {TIPO_VEICULO_MODELO_LABELS[m.tipo_veiculo]}
                              </span>
                              {jaNaLista && (
                                <span className="ml-1 text-xs text-gray-500">— já na lista</span>
                              )}
                            </span>
                          </label>
                          <AnosLateralLista anos={m.anos_referencia} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={adicionarModelosSelecionados}
                className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1857d1]"
              >
                Adicionar selecionados à compatibilidade
              </button>
              <span className="text-xs text-gray-500">
                {pickerChecked.size > 0
                  ? `${pickerChecked.size} selecionado(s) na busca`
                  : "Nenhuma caixa marcada"}
              </span>
            </div>
          </div>
        )}
      </div>

      <input type="hidden" name="compat_json" value={compatJson} aria-hidden />
      <input type="hidden" name="compat_all_modelos" value={allModelos ? "1" : "0"} aria-hidden />

      <ul className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const modelo = row.modelo_id ? modelosById.get(row.modelo_id) : undefined;
          const anosCatalog = modelo?.anos_referencia ?? [];
          const semAnos = Boolean(row.modelo_id && anosCatalog.length === 0);
          const anosSel = row.anos_selecionados ?? [];
          const selecionadosSet = new Set(anosSel);
          const nenhumAnoMarcado = row.modelo_id && anosSel.length === 0;

          return (
            <li
              key={row.key}
              className="rounded-lg border border-gray-200/80 bg-white/80 p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Modelo {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remover
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor={`modelo-${row.key}`}>
                    Modelo
                  </label>
                  <select
                    id={`modelo-${row.key}`}
                    className={fieldClass}
                    value={row.modelo_id}
                    onChange={(e) => {
                      const modelo_id = e.target.value;
                      patchRow(row.key, {
                        modelo_id,
                        anos_selecionados: modelo_id
                          ? [...todosAnosDoModelo(modelosById, modelo_id)]
                          : [],
                      });
                    }}
                  >
                    <option value="">— Nenhum —</option>
                    {modelos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.marca_nome} — {m.nome} · {TIPO_VEICULO_MODELO_LABELS[m.tipo_veiculo]}
                        {m.anos_referencia.length === 0 ? " (sem anos cadastrados)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {semAnos && (
                  <p className="text-xs text-amber-800">
                    Este modelo não tem anos de referência. Cadastre-os em{" "}
                    <Link
                      href="/admin/marcas-e-modelos"
                      className="font-medium underline hover:no-underline"
                    >
                      Marcas e modelos
                    </Link>{" "}
                    antes de vincular aqui.
                  </p>
                )}
                {nenhumAnoMarcado && !semAnos && (
                  <p className="text-xs text-amber-800">Selecione ao menos um ano para este modelo.</p>
                )}
                {row.modelo_id && anosCatalog.length > 0 && (
                  <AnosCheckboxGrid
                    anosCatalog={anosCatalog}
                    selecionados={selecionadosSet}
                    onChange={(anos_selecionados) => patchRow(row.key, { anos_selecionados })}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 w-full rounded-lg border border-dashed border-gray-300 bg-white/60 py-2 text-sm font-medium text-gray-700 transition hover:border-admin-accent hover:bg-[#1d63ed]/5 hover:text-admin-accent"
      >
        + Adicionar outro modelo
      </button>
    </fieldset>
  );
}
