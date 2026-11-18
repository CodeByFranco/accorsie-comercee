"use client";

import { useActionState, useState, useTransition } from "react";

import { definirLogisticaPedidoAction } from "@/features/pedidos-admin/services/atualizarPedidoLogistica";
import {
  fluxoEtiquetaMelhorEnvioAutomaticoAction,
  type FluxoEtiquetaMelhorEnvioActionState,
} from "@/features/pedidos-admin/services/fluxoEtiquetaMelhorEnvioAction";
import { logisticaLabel } from "@/features/pedidos-admin/utils/pedidoAdminStatus";
import type { PedidoLogisticaStatus, PedidoStatus } from "@/types/pedido";

const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60";
const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60";

const ETAPAS: PedidoLogisticaStatus[] = ["nao_iniciado", "em_separacao", "postado", "entregue"];

export function PedidoAcoes({
  pedidoId,
  status,
  logisticaStatus,
  retiradaLoja,
  etiquetaUrl,
}: {
  pedidoId: string;
  status: PedidoStatus;
  logisticaStatus: PedidoLogisticaStatus;
  retiradaLoja: boolean;
  etiquetaUrl: string | null;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [etq, etqAction, etqPending] = useActionState<FluxoEtiquetaMelhorEnvioActionState | null, FormData>(
    fluxoEtiquetaMelhorEnvioAutomaticoAction,
    null,
  );

  const urlEtiqueta = etq?.etiquetaUrl ?? etiquetaUrl;
  const pago = status === "pago";

  const definir = (input: { logisticaStatus?: PedidoLogisticaStatus; retiradaLoja?: boolean }) => {
    setErro(null);
    startTransition(async () => {
      const r = await definirLogisticaPedidoAction({ pedidoId, ...input });
      if (r.error) setErro(r.error);
    });
  };

  let principal: React.ReactNode = null;
  if (!pago) {
    principal = <p className="text-sm text-gray-600">Libere o envio depois que o pagamento for confirmado.</p>;
  } else if (retiradaLoja) {
    if (logisticaStatus === "nao_iniciado") {
      principal = (
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => definir({ logisticaStatus: "em_separacao" })}>
          Separado — pronto para retirar
        </button>
      );
    } else if (logisticaStatus !== "entregue") {
      principal = (
        <button type="button" className={btnPrimary} disabled={pending} onClick={() => definir({ logisticaStatus: "entregue" })}>
          Cliente retirou
        </button>
      );
    }
  } else if (logisticaStatus === "entregue") {
    principal = null;
  } else if (logisticaStatus === "postado") {
    principal = (
      <button type="button" className={btnPrimary} disabled={pending} onClick={() => definir({ logisticaStatus: "entregue" })}>
        Marcar como entregue
      </button>
    );
  } else if (urlEtiqueta) {
    principal = (
      <>
        <a href={urlEtiqueta} target="_blank" rel="noreferrer" className={btnPrimary}>
          Imprimir etiqueta
        </a>
        <button type="button" className={btnSecondary} disabled={pending} onClick={() => definir({ logisticaStatus: "postado" })}>
          Marcar como postado
        </button>
      </>
    );
  } else {
    principal = (
      <form action={etqAction}>
        <input type="hidden" name="pedido_id" value={pedidoId} />
        <button type="submit" className={btnPrimary} disabled={etqPending}>
          {etqPending ? "Gerando etiqueta…" : "Gerar etiqueta"}
        </button>
      </form>
    );
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Próximo passo</p>
          <ol className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            {ETAPAS.filter((e) => !(retiradaLoja && e === "postado")).map((e, i, arr) => {
              const atual = ETAPAS.indexOf(logisticaStatus);
              const feito = ETAPAS.indexOf(e) <= atual;
              return (
                <li key={e} className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!pago || pending || e === logisticaStatus}
                    onClick={() => definir({ logisticaStatus: e })}
                    title="Definir este status"
                    className={`rounded-full px-2.5 py-1 font-medium transition disabled:cursor-default ${
                      e === logisticaStatus
                        ? "bg-admin-accent text-white"
                        : feito
                          ? "bg-admin-accent/10 text-admin-accent hover:bg-admin-accent/20"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {logisticaLabel(e, retiradaLoja)}
                  </button>
                  {i < arr.length - 1 ? <span className="text-gray-300">→</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex flex-wrap gap-2">
          {principal ?? <span className="text-sm font-medium text-emerald-700">Pedido concluído ✓</span>}
        </div>
      </div>

      {urlEtiqueta && !retiradaLoja && (logisticaStatus === "postado" || logisticaStatus === "entregue") ? (
        <a href={urlEtiqueta} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-admin-accent hover:underline">
          Reimprimir etiqueta
        </a>
      ) : null}

      {erro || etq?.error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {erro ?? etq?.error}
        </p>
      ) : null}
      {etq?.ok && etq.info ? <p className="mt-3 text-sm text-emerald-800">{etq.info}</p> : null}
    </section>
  );
}
