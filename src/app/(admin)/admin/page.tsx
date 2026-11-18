import Link from "next/link";

import { SiteMaintenanceCard } from "@/features/admin/components/SiteMaintenanceCard";
import { MelhorEnvioSaldoPanel } from "@/features/pedidos-admin/components/MelhorEnvioSaldoPanel";
import { pedidoNaAba } from "@/features/pedidos-admin/utils/pedidoAdminStatus";
import { ensureMelhorEnvioAccessToken, fetchMelhorEnvioBalance } from "@/services/melhorEnvio";
import { formatPedidoDate, formatPedidoMoney, formatPedidoStatus } from "@/features/pedidos/utils/pedidoDisplay";
import { listPedidosAdmin } from "@/features/pedidos-admin/services/listPedidosAdmin";
import type { AdminPedidoListRow } from "@/types/pedido";

export const metadata = {
  title: "Visão geral | Admin",
};

function KpiCard({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1d63ed]/10 text-admin-accent">
          {children}
        </div>
      </div>
    </div>
  );
}

function IconBoxes() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8l8-4 8 4v8l-8 4-8-4V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4 8l8 4M12 12v8M12 12l8-4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconStack() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 10l6 3 6-3M6 14l6 3 6-3M6 18l6 3 6-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCurrency() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M7 7h6.5a2.5 2.5 0 010 5H9a2.5 2.5 0 000 5h6M7 17h6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V5M8 17V9M12 15v-3M16 12V7M20 10v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

async function loadSaldo(): Promise<{
  data: { balance: number; reserved: number; debts: number } | null;
  error: string | null;
}> {
  try {
    const res = await fetchMelhorEnvioBalance(await ensureMelhorEnvioAccessToken());
    if (!res.ok) return { data: null, error: res.message };
    return { data: { balance: res.balance, reserved: res.reserved, debts: res.debts }, error: null };
  } catch {
    return { data: null, error: "Não foi possível consultar o saldo." };
  }
}

function AcaoCard({ href, label, n, tom }: { href: string; label: string; n: number; tom: "amber" | "gray" }) {
  const ativo = n > 0;
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-xl border p-5 shadow-sm transition ${
        ativo && tom === "amber"
          ? "border-amber-200 bg-amber-50 hover:bg-amber-100/70"
          : "border-gray-100 bg-white hover:bg-gray-50"
      }`}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${ativo && tom === "amber" ? "text-amber-900" : "text-gray-900"}`}>{n}</p>
      </div>
      <span className="text-sm font-medium text-admin-accent group-hover:underline">Ver →</span>
    </Link>
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default async function AdminDashboardPage() {
  let configError: string | null = null;
  let loadError: string | null = null;
  let pedidos: AdminPedidoListRow[] = [];

  try {
    pedidos = await listPedidosAdmin();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar painel.";
    configError =
      message.includes("SUPABASE_SERVICE_ROLE_KEY") || message.includes("NEXT_PUBLIC_SUPABASE_URL")
        ? message
        : null;
    loadError = configError ? null : message;
  }

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const pedidosPagos = pedidos.filter((p) => p.status === "pago");
  const receitaTotal = pedidosPagos.reduce((acc, p) => acc + Number(p.total), 0);
  const receitaMes = pedidosPagos
    .filter((p) => new Date(p.created_at) >= inicioMes)
    .reduce((acc, p) => acc + Number(p.total), 0);
  const vendasHoje = pedidosPagos.filter((p) => isSameDay(new Date(p.created_at), hoje)).length;
  const ticketMedio = pedidosPagos.length > 0 ? receitaTotal / pedidosPagos.length : 0;
  const ultimasVendas = pedidos.slice(0, 8);
  const aEnviar = pedidos.filter((p) => pedidoNaAba(p, "a-enviar")).length;
  const aguardando = pedidos.filter((p) => pedidoNaAba(p, "aguardando")).length;
  const saldo = await loadSaldo();

  return (
    <div className="space-y-6">
      <SiteMaintenanceCard />

      {configError && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Configuração</p>
          <p className="mt-1 text-amber-900/90">{configError}</p>
        </div>
      )}

      {loadError && !configError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Erro ao carregar</p>
          <p className="mt-1">{loadError}</p>
        </div>
      )}

      {!configError && !loadError && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <AcaoCard href="/admin/pedidos" label="Pedidos a enviar" n={aEnviar} tom="amber" />
            <AcaoCard href="/admin/pedidos?aba=aguardando" label="Aguardando pagamento" n={aguardando} tom="gray" />
            <MelhorEnvioSaldoPanel initial={saldo.data} initialError={saldo.error} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Receita total"
              value={formatPedidoMoney(receitaTotal)}
              hint="Somente pedidos pagos"
            >
              <IconCurrency />
            </KpiCard>
            <KpiCard
              label="Receita do mês"
              value={formatPedidoMoney(receitaMes)}
              hint="Mês atual"
            >
              <IconTrend />
            </KpiCard>
            <KpiCard
              label="Vendas hoje"
              value={String(vendasHoje)}
              hint="Pedidos pagos no dia"
            >
              <IconBoxes />
            </KpiCard>
            <KpiCard
              label="Ticket médio"
              value={formatPedidoMoney(ticketMedio)}
              hint="Média por pedido pago"
            >
              <IconStack />
            </KpiCard>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <h2 className="text-base font-semibold text-gray-900">Últimos pedidos</h2>
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Ver todos os pedidos
              </Link>
            </div>

            {ultimasVendas.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-gray-500">
                Nenhum pedido encontrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Data</th>
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-6 py-3">Pagamento</th>
                      <th className="px-6 py-3 text-right">Total</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ultimasVendas.map((p) => {
                      return (
                        <tr key={p.id} className="text-gray-900 transition hover:bg-gray-50/80">
                          <td className="px-6 py-4 text-gray-600">{formatPedidoDate(p.created_at)}</td>
                          <td className="px-6 py-4 font-medium">{p.destinatario_nome}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                p.status === "pago"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {formatPedidoStatus(p.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums font-medium">
                            {formatPedidoMoney(p.total)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/admin/pedidos/${p.id}`}
                              className="font-medium text-admin-accent hover:underline"
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
