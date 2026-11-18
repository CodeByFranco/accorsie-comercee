"use client";

import { useActionState } from "react";

import {
  sincronizarPagamentoMercadoPagoAction,
  type SincronizarPagamentoActionState,
} from "@/features/pedidos-admin/services/sincronizarPagamentoMercadoPagoAction";

const btnClass =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60";

export function PedidoMercadoPagoSyncButton({ pedidoId }: { pedidoId: string }) {
  const [state, formAction, pending] = useActionState<
    SincronizarPagamentoActionState | null,
    FormData
  >(sincronizarPagamentoMercadoPagoAction, null);

  return (
    <div className="mt-3 space-y-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="pedido_id" value={pedidoId} />
        <button type="submit" disabled={pending} className={btnClass}>
          {pending ? "Atualizando…" : "Atualizar pagamento"}
        </button>
      </form>
      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-900" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.info ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900">
          {state.info}
        </p>
      ) : null}
    </div>
  );
}
