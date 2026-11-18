"use client";

import { useActionState, useMemo } from "react";

import {
  consultarSaldoMelhorEnvioAction,
  type ConsultarSaldoMelhorEnvioState,
} from "@/features/pedidos-admin/services/consultarSaldoMelhorEnvioAction";

function formatBrl(n: number): string {
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return String(n);
  }
}

const btnClass =
  "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-100 disabled:opacity-60";

export function MelhorEnvioSaldoPanel({
  initial,
  initialError,
}: {
  initial: { balance: number; reserved: number; debts: number } | null;
  initialError: string | null;
}) {
  const initialState = useMemo((): ConsultarSaldoMelhorEnvioState | null => {
    if (initialError) return { error: initialError };
    if (initial) {
      return {
        ok: true,
        balance: initial.balance,
        reserved: initial.reserved,
        debts: initial.debts,
      };
    }
    return null;
  }, [initial, initialError]);

  const [state, formAction, pending] = useActionState<
    ConsultarSaldoMelhorEnvioState | null,
    FormData
  >(consultarSaldoMelhorEnvioAction, initialState);

  const display = state ?? initialState;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Saldo Melhor Envio</h3>
        <form action={formAction}>
          <button type="submit" disabled={pending} className={btnClass}>
            {pending ? "…" : "Atualizar"}
          </button>
        </form>
      </div>
      {display?.error ? (
        <p className="mt-2 text-xs text-red-800">{display.error}</p>
      ) : display?.ok ? (
        <div className="mt-1">
          <p className={`text-3xl font-bold tabular-nums ${(display.balance ?? 0) < 30 ? "text-red-700" : "text-gray-900"}`}>
            {formatBrl(display.balance ?? 0)}
          </p>
          {(display.reserved ?? 0) > 0 || (display.debts ?? 0) > 0 ? (
            <p className="mt-0.5 text-xs text-gray-500">
              Reservado {formatBrl(display.reserved ?? 0)}
              {(display.debts ?? 0) > 0 ? ` · Débitos ${formatBrl(display.debts ?? 0)}` : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-500">—</p>
      )}
    </div>
  );
}
