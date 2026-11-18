import { listClientesAdmin } from "@/features/admin/services/listClientesAdmin";
import { formatPedidoDate } from "@/features/pedidos/utils/pedidoDisplay";
import type { AdminClienteRow } from "@/types/clienteAdmin";

export const metadata = {
  title: "Clientes | Admin",
};

function situacaoLabel(row: AdminClienteRow): { text: string; className: string } {
  if (row.pedidos_count > 0) {
    return {
      text: "Comprou no site",
      className: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    };
  }
  return {
    text: "Só cadastro",
    className: "bg-gray-100 text-gray-700 ring-gray-200",
  };
}

export default async function AdminClientesPage() {
  let clientes: AdminClienteRow[] = [];
  let fatalMessage: string | null = null;
  let isConfig = false;

  try {
    clientes = await listClientesAdmin();
  } catch (e) {
    fatalMessage = e instanceof Error ? e.message : "Erro ao carregar clientes.";
    isConfig =
      fatalMessage.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      fatalMessage.includes("NEXT_PUBLIC_SUPABASE_URL");
  }

  return (
    <div className="space-y-6">
      {fatalMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
            isConfig
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-red-200 bg-red-50 text-red-950"
          }`}
          role="alert"
        >
          <p className="font-semibold">{isConfig ? "Configuração" : "Erro ao carregar"}</p>
          <p className={isConfig ? "mt-1 text-amber-900/90" : "mt-1"}>{fatalMessage}</p>
          {isConfig && (
            <p className="mt-2 text-xs text-amber-800/80">
              Defina <code className="rounded bg-black/5 px-1">SUPABASE_SERVICE_ROLE_KEY</code> no ambiente do
              servidor para o painel listar clientes e e-mails.
            </p>
          )}
        </div>
      )}

      {!fatalMessage && (
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Clientes</h2>
          </div>

          {clientes.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">
              Nenhum cliente cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">E-mail</th>
                    <th className="px-6 py-3">Telefone</th>
                    <th className="px-6 py-3">Cadastro</th>
                    <th className="px-6 py-3">Situação</th>
                    <th className="px-6 py-3 text-right">Pedidos</th>
                    <th className="px-6 py-3">Último pedido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientes.map((c) => {
                    const sit = situacaoLabel(c);
                    return (
                      <tr key={c.user_id} className="text-gray-900 transition hover:bg-gray-50/80">
                        <td className="max-w-[200px] px-6 py-4 font-medium">{c.nome_completo}</td>
                        <td className="max-w-[220px] truncate px-6 py-4 text-gray-700">
                          {c.email ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">{c.telefone ?? "—"}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                          {formatPedidoDate(c.cadastro_em)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${sit.className}`}
                          >
                            {sit.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-gray-800">{c.pedidos_count}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                          {c.ultimo_pedido_em ? formatPedidoDate(c.ultimo_pedido_em) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
