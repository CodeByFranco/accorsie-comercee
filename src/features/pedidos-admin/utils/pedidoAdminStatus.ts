import type { AdminPedidoListRow, PedidoLogisticaStatus, PedidoStatus } from "@/types/pedido";

export const PEDIDO_ABAS = [
  { id: "a-enviar", label: "A enviar" },
  { id: "aguardando", label: "Aguardando pagamento" },
  { id: "postados", label: "Postados" },
  { id: "entregues", label: "Entregues" },
  { id: "devolucoes", label: "Devoluções" },
  { id: "todos", label: "Todos" },
] as const;

export type PedidoAbaId = (typeof PEDIDO_ABAS)[number]["id"];

export function parsePedidoAba(v: string | undefined): PedidoAbaId {
  return PEDIDO_ABAS.some((a) => a.id === v) ? (v as PedidoAbaId) : "a-enviar";
}

type StatusFields = Pick<AdminPedidoListRow, "status" | "logistica_status" | "devolucao_status">;

export function pedidoNaAba(p: StatusFields, aba: PedidoAbaId): boolean {
  switch (aba) {
    case "a-enviar":
      return p.status === "pago" && (p.logistica_status === "nao_iniciado" || p.logistica_status === "em_separacao");
    case "aguardando":
      return p.status === "aguardando_pagamento";
    case "postados":
      return p.logistica_status === "postado" && !p.devolucao_status;
    case "entregues":
      return p.logistica_status === "entregue" && !p.devolucao_status;
    case "devolucoes":
      return p.devolucao_status === "aguardando_retorno";
    default:
      return true;
  }
}

/** Rótulo de envio; retirada na loja usa termos próprios. */
export function logisticaLabel(status: PedidoLogisticaStatus, retirada: boolean | null | undefined): string {
  if (retirada) {
    return {
      nao_iniciado: "A separar",
      em_separacao: "Pronto p/ retirar",
      postado: "Pronto p/ retirar",
      entregue: "Retirado",
    }[status];
  }
  return {
    nao_iniciado: "A enviar",
    em_separacao: "Etiqueta gerada",
    postado: "Postado",
    entregue: "Entregue",
  }[status];
}

export function logisticaPillClass(ls: PedidoLogisticaStatus): string {
  switch (ls) {
    case "entregue":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    case "postado":
      return "bg-sky-50 text-sky-900 ring-sky-200";
    case "em_separacao":
      return "bg-amber-50 text-amber-950 ring-amber-200";
    default:
      return "bg-gray-100 text-gray-700 ring-gray-200";
  }
}

export function pagamentoPillClass(status: PedidoStatus): string {
  if (status === "pago") return "bg-emerald-50 text-emerald-900 ring-emerald-200";
  if (status === "aguardando_pagamento") return "bg-amber-50 text-amber-950 ring-amber-200";
  if (status === "cancelado" || status === "falha_pagamento" || status === "reembolsado")
    return "bg-red-50 text-red-900 ring-red-200";
  return "bg-gray-100 text-gray-700 ring-gray-200";
}

export const devolucaoPillClass = "bg-orange-50 text-orange-900 ring-orange-200";

export const pillBase = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
