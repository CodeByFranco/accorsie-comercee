import type { SupabaseClient } from "@supabase/supabase-js";

import { buildPedidoTransactionalContent } from "@/services/email/buildPedidoEmail";
import { getEmailSender } from "@/services/email/getEmailSender";
import { buildPedidoAbsoluteUrl } from "@/services/email/publicAppUrl";
import type { TransactionalEmailKind } from "@/services/email/types";

function kindToRpcTipo(
  kind: Exclude<TransactionalEmailKind, "pedido_reembolsado">,
): "pedido_criado" | "pagamento_confirmado" | "enviado" {
  if (kind === "pedido_enviado") {
    return "enviado";
  }
  if (kind === "pedido_criado") {
    return "pedido_criado";
  }
  return "pagamento_confirmado";
}

function formatMoney(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return String(value);
  }
}

/**
 * Envia e-mail transacional e grava timestamp de idempotência via RPC (apenas se `send` retornar ok).
 * Erros são engolidos nos ganchos — não devem derrubar checkout nem webhook.
 */
export async function sendPedidoTransactionalEmail(
  admin: SupabaseClient,
  opts: {
    pedidoId: string;
    kind: TransactionalEmailKind;
    toEmail: string | null | undefined;
    total?: string | number | null;
    trackingCode?: string | null;
    trackingUrl?: string | null;
  },
): Promise<void> {
  const to = opts.toEmail?.trim();
  if (!to) {
    return;
  }

  const column =
    opts.kind === "pedido_criado"
      ? "email_pedido_criado_at"
      : opts.kind === "pagamento_confirmado"
        ? "email_pagamento_confirmado_at"
        : opts.kind === "pedido_reembolsado"
          ? "email_reembolso_at"
          : "email_enviado_at";

  const { data: row, error: readError } = await admin
    .from("pedidos")
    .select(`${column}, status`)
    .eq("id", opts.pedidoId)
    .maybeSingle();

  if (readError) {
    console.error("[email] leitura idempotência:", readError.message);
    return;
  }

  const stamp = row as Record<string, string | null> | null;
  if (stamp?.[column]) {
    return;
  }

  if (opts.kind === "pagamento_confirmado" && stamp?.status !== "pago") {
    return;
  }

  const pedidoUrl = buildPedidoAbsoluteUrl(opts.pedidoId);
  const totalLabel = formatMoney(opts.total ?? undefined);

  const { subject, text } = buildPedidoTransactionalContent({
    kind: opts.kind,
    pedidoId: opts.pedidoId,
    to,
    pedidoUrl,
    totalLabel,
    trackingCode: opts.trackingCode?.trim() || undefined,
    trackingUrl: opts.trackingUrl?.trim() || undefined,
  });

  let sender;
  try {
    sender = getEmailSender();
  } catch (e) {
    console.error("[email] provedor:", e instanceof Error ? e.message : e);
    return;
  }

  const result = await sender.send({ to, subject, text });
  if (!result.ok) {
    console.error("[email] envio falhou:", opts.kind, opts.pedidoId);
    return;
  }

  if (opts.kind === "pedido_reembolsado") {
    const { error: stampError } = await admin
      .from("pedidos")
      .update({ email_reembolso_at: new Date().toISOString() })
      .eq("id", opts.pedidoId);
    if (stampError) console.error("[email] marcar reembolso:", stampError.message);
    return;
  }

  const { error: rpcError } = await admin.rpc("admin_pedido_marcar_email_disparado", {
    p_pedido_id: opts.pedidoId,
    p_tipo: kindToRpcTipo(opts.kind),
  });

  if (rpcError) {
    console.error("[email] RPC marcar disparo:", rpcError.message);
  }
}
