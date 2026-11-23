"use client";

import { useActionState } from "react";

import {
  reembolsarPedidoAction,
  type ReembolsarPedidoActionState,
} from "@/features/pedidos-admin/services/reembolsarPedidoAction";

export function PedidoReembolsarButton({ pedidoId }: { pedidoId: string }) {
  const [state, formAction, pending] = useActionState<ReembolsarPedidoActionState | null, FormData>(
    reembolsarPedidoAction,
    null,
  );

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              "Reembolsar o valor total deste pedido no Mercado Pago? As peças voltam ao estoque. Não dá para desfazer.",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="pedido_id" value={pedidoId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Reembolsando…" : "Reembolsar pedido"}
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
