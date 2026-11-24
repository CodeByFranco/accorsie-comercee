"use client";

import { useActionState, useState } from "react";

import {
  atualizarRastreioDevolucaoAction,
  cancelarDevolucaoAction,
  concluirDevolucaoAction,
  iniciarDevolucaoAction,
  reembolsarPedidoAction,
  type ReembolsarPedidoActionState,
} from "@/features/pedidos-admin/services/reembolsarPedidoAction";
import { formatPedidoDate, formatPedidoMoney } from "@/features/pedidos/utils/pedidoDisplay";
import type { AdminPedidoDetailWithItens } from "@/types/pedido";

type State = ReembolsarPedidoActionState | null;

const field =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200";
const label = "text-xs font-medium text-gray-600";
const btnDanger =
  "inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60";
const btnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60";
const linkBtn = "text-xs font-medium text-gray-500 transition hover:text-gray-900 hover:underline disabled:opacity-60";

function Mensagem({ state }: { state: State }) {
  if (state?.error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-900" role="alert">
        {state.error}
      </p>
    );
  }
  if (state?.info) {
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900">{state.info}</p>
    );
  }
  return null;
}

function Linha({ termo, valor, mono }: { termo: string; valor: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500">{termo}</dt>
      <dd className={`text-right text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>{valor}</dd>
    </div>
  );
}

function confirmar(msg: string) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(msg)) e.preventDefault();
  };
}

/** Cancelamento antes do envio, devolução depois do envio e resumo do reembolso. */
export function PedidoCancelamento({ pedido }: { pedido: AdminPedidoDetailWithItens }) {
  const [cancelState, cancelAction, cancelPending] = useActionState<State, FormData>(reembolsarPedidoAction, null);
  const [abrirState, abrirAction, abrirPending] = useActionState<State, FormData>(iniciarDevolucaoAction, null);
  const [rastState, rastAction, rastPending] = useActionState<State, FormData>(atualizarRastreioDevolucaoAction, null);
  const [encState, encAction, encPending] = useActionState<State, FormData>(cancelarDevolucaoAction, null);
  const [concState, concAction, concPending] = useActionState<State, FormData>(concluirDevolucaoAction, null);
  const [valorTipo, setValorTipo] = useState<"total" | "produtos" | "outro">("total");

  const retirada = pedido.retirada_loja === true;
  const jaEnviado = pedido.logistica_status === "postado" || pedido.logistica_status === "entregue";
  const total = Number(pedido.total) || 0;
  const frete = Number(pedido.frete) || 0;

  if (pedido.status === "reembolsado") {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">{pedido.devolucao_status ? "Devolução" : "Cancelamento"}</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <Linha termo="Reembolsado" valor={pedido.reembolso_valor != null ? formatPedidoMoney(pedido.reembolso_valor) : "—"} />
          <Linha termo="Data" valor={pedido.reembolsado_em ? formatPedidoDate(pedido.reembolsado_em) : "—"} />
          <Linha termo="Motivo" valor={pedido.devolucao_motivo ?? pedido.cancelamento_motivo ?? "—"} />
          {pedido.devolucao_rastreio ? <Linha termo="Rastreio da volta" valor={pedido.devolucao_rastreio} mono /> : null}
        </dl>
      </section>
    );
  }

  if (pedido.status !== "pago") return null;

  if (!jaEnviado) {
    const temEtiqueta = !retirada && Boolean(pedido.melhor_envio_id);
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Cancelar pedido</h2>
        <p className="mt-1 text-xs text-gray-500">
          Estorna {formatPedidoMoney(total)} no Mercado Pago e devolve as peças ao estoque.
          {temEtiqueta ? " A etiqueta já comprada será cancelada no Melhor Envio." : ""}
        </p>
        <form
          action={cancelAction}
          onSubmit={confirmar("Cancelar o pedido e reembolsar o valor total no Mercado Pago? Não dá para desfazer.")}
          className="mt-3 space-y-3"
        >
          <input type="hidden" name="pedido_id" value={pedido.id} />
          <label className="flex flex-col gap-1">
            <span className={label}>Motivo</span>
            <textarea name="motivo" required rows={2} maxLength={500} className={field} placeholder="Ex.: cliente desistiu da compra" />
          </label>
          <button type="submit" disabled={cancelPending} className={btnDanger}>
            {cancelPending ? "Cancelando…" : "Cancelar e reembolsar"}
          </button>
          <Mensagem state={cancelState} />
        </form>
      </section>
    );
  }

  if (!pedido.devolucao_status) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Devolução</h2>
        <p className="mt-1 text-xs text-gray-500">
          O pedido já saiu da loja. Abra a devolução e reembolse só depois de receber e conferir a peça.
        </p>
        <form action={abrirAction} className="mt-3 space-y-3">
          <input type="hidden" name="pedido_id" value={pedido.id} />
          <label className="flex flex-col gap-1">
            <span className={label}>Motivo</span>
            <textarea name="motivo" required rows={2} maxLength={500} className={field} placeholder="Ex.: peça não serviu no veículo" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Rastreio da volta (opcional)</span>
            <input name="rastreio" maxLength={60} className={`${field} font-mono`} />
          </label>
          <button type="submit" disabled={abrirPending} className={btnSecondary}>
            {abrirPending ? "Abrindo…" : "Abrir devolução"}
          </button>
          <Mensagem state={abrirState} />
        </form>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Devolução</h2>
        <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-900 ring-1 ring-inset ring-orange-200">
          Aguardando retorno
        </span>
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        <Linha termo="Aberta em" valor={pedido.devolucao_solicitada_em ? formatPedidoDate(pedido.devolucao_solicitada_em) : "—"} />
        <Linha termo="Motivo" valor={pedido.devolucao_motivo ?? "—"} />
      </dl>

      <form action={rastAction} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
        <input type="hidden" name="pedido_id" value={pedido.id} />
        <label className="flex flex-col gap-1">
          <span className={label}>Rastreio da volta</span>
          <span className="flex gap-2">
            <input name="rastreio" maxLength={60} defaultValue={pedido.devolucao_rastreio ?? ""} className={`${field} font-mono`} />
            <button type="submit" disabled={rastPending} className={btnSecondary}>
              {rastPending ? "Salvando…" : "Salvar"}
            </button>
          </span>
        </label>
        <Mensagem state={rastState} />
      </form>

      <form
        action={concAction}
        onSubmit={confirmar("Confirmar que a peça chegou e reembolsar o valor escolhido no Mercado Pago? Não dá para desfazer.")}
        className="mt-3 space-y-3 border-t border-gray-100 pt-3"
      >
        <input type="hidden" name="pedido_id" value={pedido.id} />
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Conferência da peça</p>

        <div className="space-y-2">
          <span className={label}>Voltam ao estoque</span>
          <ul className="space-y-1.5">
            {pedido.pedido_itens.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  name={`repor_${item.id}`}
                  min={0}
                  max={item.quantidade}
                  defaultValue={item.produto_id ? item.quantidade : 0}
                  disabled={!item.produto_id}
                  className={`${field} w-16 shrink-0 px-2 py-1 text-center tabular-nums`}
                  aria-label={`Quantidade de ${item.titulo_snapshot} que volta ao estoque`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-gray-900">{item.titulo_snapshot}</span>
                  <span className="block text-xs text-gray-500">
                    {item.produto_id ? `de ${item.quantidade} comprada(s)` : "Produto removido do catálogo"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <fieldset className="space-y-1.5">
          <legend className={label}>Valor do reembolso</legend>
          {(
            [
              ["total", `Total do pedido (${formatPedidoMoney(total)})`],
              ["produtos", `Só os produtos, sem frete (${formatPedidoMoney(Math.max(total - frete, 0))})`],
              ["outro", "Outro valor"],
            ] as const
          ).map(([v, t]) => (
            <label key={v} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="valor_tipo"
                value={v}
                checked={valorTipo === v}
                onChange={() => setValorTipo(v)}
                className="accent-admin-accent"
              />
              {t}
            </label>
          ))}
          {valorTipo === "outro" ? (
            <input name="valor_outro" inputMode="decimal" required placeholder="0,00" className={`${field} tabular-nums`} />
          ) : null}
        </fieldset>

        <button type="submit" disabled={concPending} className={btnDanger}>
          {concPending ? "Reembolsando…" : "Peça recebida — reembolsar"}
        </button>
        <Mensagem state={concState} />
      </form>

      <form
        action={encAction}
        onSubmit={confirmar("Encerrar a devolução sem reembolso? O pedido volta ao normal.")}
        className="mt-3 border-t border-gray-100 pt-3"
      >
        <input type="hidden" name="pedido_id" value={pedido.id} />
        <button type="submit" disabled={encPending} className={linkBtn}>
          {encPending ? "Encerrando…" : "Encerrar devolução sem reembolso"}
        </button>
        <div className="mt-2">
          <Mensagem state={encState} />
        </div>
      </form>
    </section>
  );
}
