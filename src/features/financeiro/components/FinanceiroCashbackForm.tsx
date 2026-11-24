"use client";

import { useActionState, useState } from "react";

import type { CashbackConfig, CashbackModo } from "@/features/cashback/cashbackRegras";
import { saveCashback, type SaveCashbackState } from "@/features/financeiro/services/saveCashback";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const OPCOES: { value: CashbackModo; titulo: string; descricao: string }[] = [
  { value: "livre", titulo: "Livre", descricao: "O cliente acumula sem limite e escolhe no checkout se usa o saldo." },
  { value: "sempre", titulo: "Sempre na próxima compra", descricao: "Havendo saldo, ele é descontado automaticamente na compra seguinte." },
  { value: "teto", titulo: "Acumula até um valor máximo", descricao: "Ao atingir o valor máximo, o saldo é descontado automaticamente na próxima compra." },
  { value: "a_cada_n", titulo: "Uso obrigatório a cada X compras", descricao: "Se o cliente fizer X compras sem usar, na X-ésima o saldo é descontado automaticamente." },
];

export function FinanceiroCashbackForm({ initial }: { initial: CashbackConfig }) {
  const [state, action, pending] = useActionState<SaveCashbackState | null, FormData>(saveCashback, null);
  const [modo, setModo] = useState<CashbackModo>(initial.modo);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <label className="block max-w-xs space-y-1 text-sm">
        <span className="font-medium text-gray-700">Percentual de cashback (%)</span>
        <input
          name="percentual"
          type="number"
          step="0.01"
          min="0"
          max="50"
          required
          defaultValue={initial.percentual}
          className={fieldClass}
        />
        <span className="block text-xs text-gray-500">Do valor pago em cada compra. Use 0 para desligar o acúmulo.</span>
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-gray-700">Regra de uso do saldo</legend>
        {OPCOES.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 p-3 text-sm">
            <input
              type="radio"
              name="modo"
              value={o.value}
              checked={modo === o.value}
              onChange={() => setModo(o.value)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-medium text-gray-900">{o.titulo}</span>
              <span className="block text-gray-600">{o.descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className={modo === "teto" ? "block max-w-xs" : "hidden"}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">Valor máximo de saldo (R$)</span>
          <input
            name="teto_valor"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={initial.tetoValor.toFixed(2)}
            className={fieldClass}
          />
        </label>
      </div>
      <div className={modo === "a_cada_n" ? "block max-w-xs" : "hidden"}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">Usar obrigatoriamente a cada (compras)</span>
          <input
            name="a_cada_n"
            type="number"
            step="1"
            min="1"
            max="100"
            defaultValue={initial.aCadaN}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar cashback"}
        </button>
        {state ? (
          <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
