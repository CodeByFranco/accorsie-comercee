"use client";

import { useActionState } from "react";

import { saveTeleRapida, type SaveTeleRapidaState } from "@/features/financeiro/services/saveTeleRapida";
import type { TeleRapidaConfig } from "@/features/frete/teleRapida/teleRapidaConfig";

const fieldClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

export function FinanceiroTeleRapidaForm({ initial, cidadeLoja }: { initial: TeleRapidaConfig; cidadeLoja: string | null }) {
  const [state, action, pending] = useActionState<SaveTeleRapidaState | null, FormData>(saveTeleRapida, null);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-600">
        Entrega própria da loja, oferecida quando o CEP do cliente é de{" "}
        <strong>{cidadeLoja ?? "mesma cidade da loja"}</strong>. Aparece no carrinho e no checkout em destaque laranja.
        Não gera etiqueta no Melhor Envio.
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" name="ativa" defaultChecked={initial.ativa} className="h-4 w-4" />
        Oferecer tele rápida
      </label>
      <label className="block max-w-xs space-y-1 text-sm">
        <span className="font-medium text-gray-700">Valor cobrado (R$)</span>
        <input
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          max="1000"
          required
          defaultValue={initial.valor.toFixed(2)}
          className={fieldClass}
        />
      </label>
      <label className="block max-w-xs space-y-1 text-sm">
        <span className="font-medium text-gray-700">Disponível até (horário de Brasília)</span>
        <input name="horario_limite" type="time" required defaultValue={initial.horarioLimite} className={fieldClass} />
        <span className="block text-xs text-gray-500">Depois desse horário a tele rápida some até o dia seguinte.</span>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-admin-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar tele rápida"}
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
