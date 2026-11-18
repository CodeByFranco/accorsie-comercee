"use client";

import { useActionState, useState, useTransition } from "react";

import { definirLogisticaPedidoAction } from "@/features/pedidos-admin/services/atualizarPedidoLogistica";
import {
  comprarEnvioMelhorEnvioAction,
  gerarEtiquetaMelhorEnvioAction,
  imprimirDocumentosMelhorEnvioAction,
} from "@/features/pedidos-admin/services/melhorEnvioLogisticaActions";
import type { AdminPedidoDetailWithItens } from "@/types/pedido";

const btn =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 transition hover:bg-gray-100 disabled:opacity-60";

/** Opções avançadas de envio: retirada na loja e etapas manuais do Melhor Envio (para quando o automático falhar). */
export function PedidoLogisticaForm({ pedido }: { pedido: AdminPedidoDetailWithItens }) {
  const [buyState, buyAction, buyPending] = useActionState(comprarEnvioMelhorEnvioAction, null);
  const [labelState, labelAction, labelPending] = useActionState(gerarEtiquetaMelhorEnvioAction, null);
  const [printState, printAction, printPending] = useActionState(imprimirDocumentosMelhorEnvioAction, null);
  const [retiradaErro, setRetiradaErro] = useState<string | null>(null);
  const [retiradaPending, startRetirada] = useTransition();
  const retirada = pedido.retirada_loja === true;

  const msgs = [buyState, labelState, printState].flatMap((s) =>
    s?.error ? [{ ok: false, t: s.error }] : s?.info ? [{ ok: true, t: s.info }] : [],
  );

  return (
    <details className="group rounded-xl border border-gray-100 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-gray-600 hover:text-gray-900">
        <span className="inline-block transition group-open:rotate-90">›</span> Opções avançadas de envio
      </summary>
      <div className="space-y-5 border-t border-gray-100 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-800">{retirada ? "Cliente vai retirar na loja" : "Envio pelos Correios / transportadora"}</span>
          <button
            type="button"
            className={btn}
            disabled={retiradaPending}
            onClick={() => {
              setRetiradaErro(null);
              startRetirada(async () => {
                const r = await definirLogisticaPedidoAction({ pedidoId: pedido.id, retiradaLoja: !retirada });
                if (r.error) setRetiradaErro(r.error);
              });
            }}
          >
            {retirada ? "Mudar para envio" : "Mudar para retirada na loja"}
          </button>
        </div>
        {retiradaErro ? <p className="text-xs text-red-700">{retiradaErro}</p> : null}

        {!retirada ? (
          <form className="space-y-2">
            <input type="hidden" name="pedido_id" value={pedido.id} />
            <input type="hidden" name="melhor_envio_id" value={pedido.melhor_envio_id ?? ""} />
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Melhor Envio — passo a passo</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" formAction={buyAction} disabled={buyPending} className={btn}>
                {buyPending ? "Comprando…" : "1. Comprar envio"}
              </button>
              <button type="submit" formAction={labelAction} disabled={labelPending} className={btn}>
                {labelPending ? "Gerando…" : "2. Gerar etiqueta"}
              </button>
              <button type="submit" formAction={printAction} disabled={printPending} className={btn}>
                {printPending ? "Buscando…" : "3. Etiqueta + declaração"}
              </button>
            </div>
            {msgs.map((m, i) => (
              <p key={i} className={`text-xs ${m.ok ? "text-emerald-700" : "text-red-700"}`}>
                {m.t}
              </p>
            ))}
            {printState?.etiquetaUrl || printState?.declaracaoConteudoUrl ? (
              <p className="flex flex-wrap gap-4 text-sm">
                {printState.etiquetaUrl ? (
                  <a href={printState.etiquetaUrl} target="_blank" rel="noreferrer" className="font-medium text-admin-accent hover:underline">
                    Abrir etiqueta
                  </a>
                ) : null}
                {printState.declaracaoConteudoUrl ? (
                  <a
                    href={printState.declaracaoConteudoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-admin-accent hover:underline"
                  >
                    Abrir declaração de conteúdo
                  </a>
                ) : null}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </details>
  );
}
