import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PedidoAcoes } from "@/features/pedidos-admin/components/PedidoAcoes";
import { PedidoDadosNF } from "@/features/pedidos-admin/components/PedidoDadosNF";
import { PedidoLogisticaForm } from "@/features/pedidos-admin/components/PedidoLogisticaForm";
import { PedidoMercadoPagoSyncButton } from "@/features/pedidos-admin/components/PedidoMercadoPagoSyncButton";
import { getPedidoAdminByIdWithItens } from "@/features/pedidos-admin/services/getPedidoAdminByIdWithItens";
import {
  logisticaLabel,
  logisticaPillClass,
  pagamentoPillClass,
  pillBase,
} from "@/features/pedidos-admin/utils/pedidoAdminStatus";
import { CopyButton } from "@/features/pedidos-admin/components/CopyButton";
import {
  formatPedidoDate,
  formatPedidoMoney,
  formatPedidoStatus,
  formatPedidoUiCode,
} from "@/features/pedidos/utils/pedidoDisplay";
import { isUuid } from "@/features/pedidos/utils/isUuid";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: isUuid(id) ? `Pedido | Admin` : "Pedido | Admin" };
}

export default async function AdminPedidoDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const pedido = await getPedidoAdminByIdWithItens(id);
  if (!pedido) notFound();

  const retirada = pedido.retirada_loja === true;

  return (
    <div className="space-y-5">
      <Link href="/admin/pedidos" className="text-sm font-medium text-admin-accent hover:underline">
        ← Pedidos
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-gray-900">#{formatPedidoUiCode(pedido.codigo_ui)}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatPedidoDate(pedido.created_at)} · {retirada ? "Retirada na loja" : "Entrega"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`${pillBase} ${pagamentoPillClass(pedido.status)}`}>{formatPedidoStatus(pedido.status)}</span>
          {pedido.status === "pago" ? (
            <span className={`${pillBase} ${logisticaPillClass(pedido.logistica_status)}`}>
              {logisticaLabel(pedido.logistica_status, retirada)}
            </span>
          ) : null}
        </div>
      </div>

      <PedidoAcoes
        pedidoId={pedido.id}
        status={pedido.status}
        logisticaStatus={pedido.logistica_status}
        retiradaLoja={retirada}
        etiquetaUrl={pedido.melhor_envio_etiqueta_url}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <h2 className="border-b border-gray-100 px-5 py-3.5 text-sm font-semibold text-gray-900">Itens</h2>
            <ul className="divide-y divide-gray-50">
              {pedido.pedido_itens.map((item) => {
                const unit = Number(item.preco_unitario);
                const sub = Number.isFinite(unit) ? unit * item.quantidade : 0;
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="w-8 shrink-0 text-center font-semibold tabular-nums text-gray-900">{item.quantidade}×</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-gray-900">{item.titulo_snapshot}</span>
                      <span className="block font-mono text-xs text-gray-500">{item.cod_produto_snapshot}</span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block font-medium text-gray-900">{formatPedidoMoney(sub)}</span>
                      {item.quantidade > 1 ? (
                        <span className="block text-xs text-gray-500">{formatPedidoMoney(item.preco_unitario)} un.</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1 border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPedidoMoney(pedido.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Frete</dt>
                <dd className="tabular-nums">{formatPedidoMoney(pedido.frete)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPedidoMoney(pedido.total)}</dd>
              </div>
            </dl>
          </section>

          <PedidoDadosNF pedido={pedido} />
        </div>

        <div className="space-y-5">
          {!retirada ? (
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Rastreio</h2>
              {pedido.rastreio_codigo ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-gray-900">{pedido.rastreio_codigo}</span>
                  <CopyButton value={pedido.rastreio_codigo} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Disponível após gerar a etiqueta.</p>
              )}
              {pedido.transportadora_nome ? <p className="mt-1 text-xs text-gray-500">{pedido.transportadora_nome}</p> : null}
              {pedido.rastreio_url ? (
                <a href={pedido.rastreio_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-admin-accent hover:underline">
                  Acompanhar entrega
                </a>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Pagamento</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Mercado Pago</dt>
                <dd className="text-gray-900">{pedido.mercadopago_status ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">ID</dt>
                <dd className="truncate font-mono text-xs text-gray-700">{pedido.mercadopago_payment_id ?? "—"}</dd>
              </div>
            </dl>
            <PedidoMercadoPagoSyncButton pedidoId={pedido.id} />
          </section>

          <PedidoLogisticaForm pedido={pedido} />
        </div>
      </div>
    </div>
  );
}
