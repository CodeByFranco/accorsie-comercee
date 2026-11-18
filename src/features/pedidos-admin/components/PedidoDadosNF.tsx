import { CopyButton } from "@/features/pedidos-admin/components/CopyButton";
import { formatCep, formatPedidoMoney } from "@/features/pedidos/utils/pedidoDisplay";
import type { AdminPedidoDetailWithItens } from "@/types/pedido";

function formatDocumento(doc: string | null): string {
  const d = (doc ?? "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc ?? "";
}

export function PedidoDadosNF({ pedido }: { pedido: AdminPedidoDetailWithItens }) {
  const endereco = `${pedido.logradouro}, ${pedido.numero}${pedido.complemento ? ` — ${pedido.complemento}` : ""}`;
  const campos: { label: string; value: string; mono?: boolean }[] = [
    { label: "Nome", value: pedido.destinatario_nome },
    { label: "CPF / CNPJ", value: formatDocumento(pedido.destinatario_documento), mono: true },
    { label: "Telefone", value: pedido.telefone },
    { label: "E-mail", value: pedido.cliente_email ?? "" },
    { label: "Endereço", value: endereco },
    { label: "Bairro", value: pedido.bairro },
    { label: "Cidade / UF", value: `${pedido.cidade}/${pedido.uf}` },
    { label: "CEP", value: formatCep(pedido.cep), mono: true },
  ];

  const itensTexto = pedido.pedido_itens
    .map((i) => `${i.quantidade}x ${i.cod_produto_snapshot} — ${i.titulo_snapshot} — ${formatPedidoMoney(i.preco_unitario)}`)
    .join("\n");

  const tudo = [
    ...campos.map((c) => `${c.label}: ${c.value || "—"}`),
    "",
    "Itens:",
    itensTexto,
    "",
    `Subtotal: ${formatPedidoMoney(pedido.subtotal)}`,
    `Frete: ${formatPedidoMoney(pedido.frete)}`,
    `Total: ${formatPedidoMoney(pedido.total)}`,
  ].join("\n");

  return (
    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">Dados para nota fiscal</h2>
        <CopyButton
          value={tudo}
          label="Copiar tudo"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        />
      </div>
      <dl className="grid divide-y divide-gray-50 sm:grid-cols-2 sm:divide-y-0">
        {campos.map((c) => (
          <div key={c.label} className="flex items-center justify-between gap-2 px-5 py-2 sm:border-b sm:border-gray-50">
            <div className="min-w-0">
              <dt className="text-xs text-gray-500">{c.label}</dt>
              <dd className={`truncate text-sm text-gray-900 ${c.mono ? "font-mono" : ""}`}>{c.value || "—"}</dd>
            </div>
            {c.value ? <CopyButton value={c.value} /> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
