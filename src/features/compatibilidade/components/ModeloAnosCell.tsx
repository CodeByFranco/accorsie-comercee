"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addModeloAno,
  removeModeloAno,
  type ModeloAnoState,
} from "@/features/compatibilidade/services/modeloActions";

const fieldClass =
  "rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const initialState: ModeloAnoState = null;

type Modo = "unico" | "intervalo";

export function ModeloAnosCell({
  modeloId,
  anos,
  onAnosMutated,
}: {
  modeloId: string;
  anos: { id: string; ano: number }[];
  onAnosMutated?: () => void;
}) {
  const [state, formAction, pending] = useActionState(addModeloAno, initialState);
  const [modo, setModo] = useState<Modo>("unico");
  const [removePending, startRemoveTransition] = useTransition();

  useEffect(() => {
    if (state?.ok === true) {
      onAnosMutated?.();
    }
  }, [state, onAnosMutated]);

  function handleRemoveAno(anoRefId: string) {
    startRemoveTransition(async () => {
      const fd = new FormData();
      fd.set("id", anoRefId);
      await removeModeloAno(fd);
      onAnosMutated?.();
    });
  }

  return (
    <div className="max-w-[20rem] space-y-1.5">
      {state && state.ok === false && (
        <p className="text-xs text-red-700" role="alert">
          {state.message}
        </p>
      )}
      {state && state.ok === true && (
        <p className="text-xs text-emerald-700" role="status">
          {state.message}
        </p>
      )}
      {anos.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {anos.map((row) => (
            <li
              key={row.id}
              className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-px text-[11px] font-medium text-gray-800"
            >
              <span>{row.ano}</span>
              <button
                type="button"
                disabled={removePending || pending}
                onClick={() => handleRemoveAno(row.id)}
                className="ml-0.5 rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50"
                aria-label={`Remover ano ${row.ano}`}
                title="Remover"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">Nenhum ano de referência ainda.</p>
      )}

      <div
        role="tablist"
        aria-label="Modo de cadastro de ano"
        className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={modo === "unico"}
          onClick={() => setModo("unico")}
          className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
            modo === "unico"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Um ano
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === "intervalo"}
          onClick={() => setModo("intervalo")}
          className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
            modo === "intervalo"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Intervalo
        </button>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-1.5">
        <input type="hidden" name="modelo_id" value={modeloId} />
        {modo === "unico" ? (
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] font-medium uppercase tracking-wide text-gray-500"
              htmlFor={`ano-${modeloId}`}
            >
              Ano
            </label>
            <input
              id={`ano-${modeloId}`}
              name="ano_inicio"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              placeholder="Ex.: 2015"
              className={`${fieldClass} w-[6rem]`}
              disabled={pending}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <label
                className="text-[10px] font-medium uppercase tracking-wide text-gray-500"
                htmlFor={`ano-ini-${modeloId}`}
              >
                De
              </label>
              <input
                id={`ano-ini-${modeloId}`}
                name="ano_inicio"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder="2022"
                className={`${fieldClass} w-[5rem]`}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label
                className="text-[10px] font-medium uppercase tracking-wide text-gray-500"
                htmlFor={`ano-fim-${modeloId}`}
              >
                Até
              </label>
              <input
                id={`ano-fim-${modeloId}`}
                name="ano_fim"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                placeholder="2025"
                className={`${fieldClass} w-[5rem]`}
                disabled={pending}
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {pending ? "…" : modo === "unico" ? "Adicionar ano" : "Adicionar intervalo"}
        </button>
      </form>

      <p className="text-[10px] leading-snug text-gray-400">
        {modo === "unico"
          ? "Cadastra um único ano (ex.: 2015)."
          : "Cadastra todos os anos do intervalo (ex.: 2022 a 2025 cadastra 2022, 2023, 2024 e 2025); anos já existentes são ignorados."}
      </p>
    </div>
  );
}
