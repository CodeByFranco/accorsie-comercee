import Link from "next/link";

import { listPedidosAdmin } from "@/features/pedidos-admin/services/listPedidosAdmin";
import {
  PEDIDO_ABAS,
  logisticaLabel,
  logisticaPillClass,
  pagamentoPillClass,
  parsePedidoAba,
  pedidoNaAba,
  pillBase,
  type PedidoAbaId,
} from "@/features/pedidos-admin/utils/pedidoAdminStatus";
import {
  formatPedidoDate,
  formatPedidoMoney,
  formatPedidoStatus,
  formatPedidoUiCode,
} from "@/features/pedidos/utils/pedidoDisplay";
import type { AdminPedidoListRow } from "@/types/pedido";

export const metadata = {
  title: "Pedidos | Admin",
};

const POR_PAGINA = 25;

type PageProps = {
  searchParams: Promise<{ aba?: string; q?: string; p?: string }>;
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function matchBusca(p: AdminPedidoListRow, q: string): boolean {
  const termo = normalize(q.trim().replace(/^#/, ""));
  if (!termo) return true;
  const digitos = termo.replace(/\D/g, "");
  if (digitos && digitos === termo.replace(/[.\-/\s]/g, "")) {
    if (Number(digitos) === p.codigo_ui) return true;
    if ((p.destinatario_documento ?? "").replace(/\D/g, "").includes(digitos)) return true;
  }
  return normalize(p.destinatario_nome ?? "").includes(termo) || normalize(p.rastreio_codigo ?? "").includes(termo);
}

function hrefFor(aba: PedidoAbaId, q: string, page = 1): string {
  const sp = new URLSearchParams();
  if (aba !== "a-enviar") sp.set("aba", aba);
  if (q) sp.set("q", q);
  if (page > 1) sp.set("p", String(page));
  const s = sp.toString();
  return s ? `/admin/pedidos?${s}` : "/admin/pedidos";
}

export default async function AdminPedidosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const aba = parsePedidoAba(sp.aba);
  const q = (sp.q ?? "").trim();

  let pedidos: AdminPedidoListRow[] = [];
  let erro: string | null = null;
  try {
    pedidos = await listPedidosAdmin();
  } catch (e) {
    erro = e instanceof Error ? e.message : "Erro ao carregar pedidos.";
  }

  const buscados = q ? pedidos.filter((p) => matchBusca(p, q)) : pedidos;
  const filtrados = buscados.filter((p) => pedidoNaAba(p, aba));
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, Number(sp.p) || 1), totalPaginas);
  const visiveis = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="space-y-5">
      {erro ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950" role="alert">
          <p className="font-semibold">Não foi possível carregar os pedidos.</p>
          <p className="mt-1 text-red-900/80">{erro}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filtrar pedidos" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PEDIDO_ABAS.map((a) => {
            const n = buscados.filter((p) => pedidoNaAba(p, a.id)).length;
            const ativa = a.id === aba;
            const destaque = a.id === "a-enviar" && n > 0;
            return (
              <Link
                key={a.id}
                href={hrefFor(a.id, q)}
                aria-current={ativa ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  ativa ? "bg-admin-accent text-white shadow-sm" : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                {a.label}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    ativa ? "bg-white/20" : destaque ? "bg-amber-100 text-amber-900" : "bg-gray-200/70 text-gray-600"
                  }`}
                >
                  {n}
                </span>
              </Link>
            );
          })}
        </nav>

        <form action="/admin/pedidos" className="flex gap-2">
          {aba !== "a-enviar" ? <input type="hidden" name="aba" value={aba} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nome, nº do pedido ou CPF"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 lg:w-64"
          />
          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Buscar
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {visiveis.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-500">
            {q ? "Nenhum pedido encontrado." : aba === "a-enviar" ? "Nada para enviar agora. 🎉" : "Nenhum pedido aqui."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visiveis.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/pedidos/${p.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition hover:bg-gray-50 sm:px-6 md:grid-cols-[4.5rem_1fr_auto_auto_7rem]"
                >
                  <span className="font-mono text-sm font-semibold text-gray-900">#{formatPedidoUiCode(p.codigo_ui)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{p.destinatario_nome}</span>
                    <span className="block text-xs text-gray-500">
                      {formatPedidoDate(p.created_at)}
                      {p.retirada_loja ? " · Retirada na loja" : p.rastreio_codigo ? ` · ${p.rastreio_codigo}` : ""}
                    </span>
                  </span>
                  <span className="col-start-3 row-start-1 text-right text-sm font-semibold tabular-nums text-gray-900 md:col-start-5">
                    {formatPedidoMoney(p.total)}
                  </span>
                  <span className="col-span-3 flex flex-wrap gap-1.5 md:col-span-2 md:col-start-3 md:row-start-1 md:justify-end">
                    <span className={`${pillBase} ${pagamentoPillClass(p.status)}`}>{formatPedidoStatus(p.status)}</span>
                    {p.status === "pago" ? (
                      <span className={`${pillBase} ${logisticaPillClass(p.logistica_status)}`}>
                        {logisticaLabel(p.logistica_status, p.retirada_loja)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPaginas > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm sm:px-6">
            <span className="text-gray-500">
              Página {pagina} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              {pagina > 1 ? (
                <Link href={hrefFor(aba, q, pagina - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
                  Anterior
                </Link>
              ) : null}
              {pagina < totalPaginas ? (
                <Link href={hrefFor(aba, q, pagina + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
                  Próxima
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
