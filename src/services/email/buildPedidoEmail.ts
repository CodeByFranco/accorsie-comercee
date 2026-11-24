import type { TransactionalEmailKind, TransactionalEmailPayload } from "@/services/email/types";

function subjectFor(kind: TransactionalEmailKind): string {
  switch (kind) {
    case "pedido_criado":
      return "Pedido recebido — aguardando pagamento";
    case "pagamento_confirmado":
      return "Pagamento confirmado";
    case "pedido_enviado":
      return "Pedido enviado";
    case "pedido_reembolsado":
      return "Pedido cancelado — reembolso realizado";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function bodyFor(payload: TransactionalEmailPayload): string {
  const totalLine =
    payload.totalLabel !== undefined && payload.totalLabel !== ""
      ? `Total: ${payload.totalLabel}\n`
      : "";

  switch (payload.kind) {
    case "pedido_criado":
      return [
        "Recebemos seu pedido.",
        "",
        totalLine.trimEnd(),
        "",
        `Acompanhe em: ${payload.pedidoUrl}`,
        "",
        "Se você já foi redirecionado ao Mercado Pago, conclua o pagamento por lá.",
      ]
        .filter((line) => line !== "")
        .join("\n");

    case "pagamento_confirmado":
      return [
        "Seu pagamento foi confirmado.",
        "",
        totalLine.trimEnd(),
        "",
        `Detalhes do pedido: ${payload.pedidoUrl}`,
      ]
        .filter((line) => line !== "")
        .join("\n");

    case "pedido_enviado":
      return [
        "Seu pedido foi despachado.",
        payload.trackingCode ? `Código de rastreio: ${payload.trackingCode}` : "",
        payload.trackingUrl ? `Rastreio: ${payload.trackingUrl}` : "",
        "",
        `Acompanhe em: ${payload.pedidoUrl}`,
      ]
        .filter((line) => line !== "")
        .join("\n");

    case "pedido_reembolsado":
      return [
        "Seu pedido foi cancelado e o reembolso já foi solicitado ao Mercado Pago.",
        ...(payload.totalLabel ? [`Valor reembolsado: ${payload.totalLabel}`] : []),
        "",
        "Pix: o valor volta para a sua conta em poucos minutos.",
        "Cartão de crédito: o estorno aparece em até 2 faturas, conforme o seu banco.",
        "",
        `Detalhes do pedido: ${payload.pedidoUrl}`,
      ].join("\n");

    default: {
      const _exhaustive: never = payload.kind;
      return _exhaustive;
    }
  }
}

export function buildPedidoTransactionalContent(payload: TransactionalEmailPayload): {
  subject: string;
  text: string;
} {
  return {
    subject: subjectFor(payload.kind),
    text: bodyFor(payload),
  };
}
