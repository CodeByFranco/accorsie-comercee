"use client";

import { useActionState, useMemo, useState } from "react";

import {
  saveParcelamentoFaixas,
  type SaveParcelamentoState,
} from "@/features/financeiro/services/saveParcelamentoFaixas";
import {
  PARCELAS_SEM_JUROS_MAX,
  PARCELAS_SEM_JUROS_MIN,
  resumoParcelamentoFaixas,
  type ParcelamentoFaixa,
} from "@/features/produtos/utils/parcelamento";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

type Row = {
  key: string;
  valorMinimo: string;
  maxParcelas: string;
};

function rowsFromFaixas(faixas: ParcelamentoFaixa[]): Row[] {
  return faixas.map((faixa) => ({
    key: `${faixa.valorMinimo}-${faixa.maxParcelas}-${Math.random().toString(36).slice(2, 8)}`,
    valorMinimo: String(faixa.valorMinimo),
    maxParcelas: String(faixa.maxParcelas),
  }));
}

function parseDraft(rows: Row[]): ParcelamentoFaixa[] {
  const faixas: ParcelamentoFaixa[] = [];
  for (const row of rows) {
    const valorMinimo = Number(String(row.valorMinimo).replace(",", "."));
    const maxParcelas = Number(row.maxParcelas);
    if (!Number.isFinite(valorMinimo) || valorMinimo <= 0) continue;
    if (!Number.isInteger(maxParcelas) || maxParcelas < PARCELAS_SEM_JUROS_MIN) continue;
    faixas.push({ valorMinimo, maxParcelas });
  }
  return faixas;
}

export function FinanceiroParcelamentoForm({ initial }: { initial: ParcelamentoFaixa[] }) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromFaixas(initial));
  const [state, formAction, pending] = useActionState(saveParcelamentoFaixas, null as SaveParcelamentoState | null);
  const resumo = useMemo(() => resumoParcelamentoFaixas(parseDraft(rows)), [rows]);
  const faixasJson = JSON.stringify(
    rows.map((row) => ({
      valorMinimo: Number(String(row.valorMinimo).replace(",", ".")),
      maxParcelas: Number(row.maxParcelas),
    })),
  );

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Parcelamento sem juros</h2>
      <p className="mt-1 max-w-2xl text-sm text-gray-600">
        Cada faixa vale a partir do valor informado. Abaixo da menor, só à vista.
      </p>

      {state?.ok === true && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {state.message}
        </p>
      )}
      {state?.ok === false && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {state.message}
        </p>
      )}

      <input type="hidden" name="faixas_json" value={faixasJson} />

      <ul className="mt-6 flex flex-col gap-3">
        {rows.map((row, index) => (
          <li key={row.key} className="grid gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              A partir de (R$)
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={row.valorMinimo}
                onChange={(e) =>
                  setRows((atual) =>
                    atual.map((item) => (item.key === row.key ? { ...item, valorMinimo: e.target.value } : item)),
                  )
                }
                className={fieldClass}
                aria-label={`Valor mínimo da faixa ${index + 1}`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Parcelas sem juros
              <input
                type="number"
                min={PARCELAS_SEM_JUROS_MIN}
                max={PARCELAS_SEM_JUROS_MAX}
                step="1"
                required
                value={row.maxParcelas}
                onChange={(e) =>
                  setRows((atual) =>
                    atual.map((item) => (item.key === row.key ? { ...item, maxParcelas: e.target.value } : item)),
                  )
                }
                className={fieldClass}
                aria-label={`Parcelas da faixa ${index + 1}`}
              />
            </label>
            <button
              type="button"
              onClick={() => setRows((atual) => atual.filter((item) => item.key !== row.key))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Nenhuma faixa. Ao salvar, o cartão fica sempre à vista.</p>
      ) : null}

      <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700">{resumo}</p>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={() =>
            setRows((atual) => [
              ...atual,
              { key: crypto.randomUUID(), valorMinimo: "", maxParcelas: String(PARCELAS_SEM_JUROS_MIN) },
            ])
          }
          className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-admin-accent hover:text-admin-accent"
        >
          + Adicionar faixa
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Salvar parcelamento"}
        </button>
      </div>
    </form>
  );
}
