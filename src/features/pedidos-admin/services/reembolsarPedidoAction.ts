"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { refundPayment } from "@/services/mercadopago/client";
import { createAdminClient } from "@/services/supabase/admin";

export type ReembolsarPedidoActionState = {
  ok?: boolean;
  error?: string;
  info?: string;
};

/**
 * Estorna o pagamento inteiro no Mercado Pago e marca o pedido como reembolsado.
 * O banco devolve estoque e ajusta cashback pelos triggers de status.
 */
export async function reembolsarPedidoAction(
  _prev: ReembolsarPedidoActionState | null,
  formData: FormData,
): Promise<ReembolsarPedidoActionState> {
  await requireAdmin();
  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  if (!pedidoId) return { error: "Pedido inválido." };

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) return { error: "Servidor sem MERCADOPAGO_ACCESS_TOKEN." };

  const admin = createAdminClient();
  const { data: pedido, error } = await admin
    .from("pedidos")
    .select("id, status, mercadopago_payment_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (error || !pedido) return { error: "Pedido não encontrado." };
  if (pedido.status !== "pago") return { error: "Só é possível reembolsar pedidos pagos." };

  const paymentId = (pedido.mercadopago_payment_id as string | null)?.trim() ?? "";
  if (!paymentId) {
    return { error: "Pedido sem ID de pagamento do Mercado Pago. Use \"Atualizar pagamento\" primeiro." };
  }

  const mp = await refundPayment(paymentId, {
    accessToken,
    idempotencyKey: `reembolso-${pedido.id}`,
  });
  if (!mp.ok) return { error: `Mercado Pago recusou o reembolso: ${mp.detail}` };

  const { data: rpc, error: rpcError } = await admin.rpc("mercadopago_aplicar_estado_pagamento", {
    p_pedido_id: pedido.id,
    p_mp_payment_id: paymentId,
    p_mp_status: "refunded",
  });
  const row = rpc as { ok?: boolean; error?: string } | null;
  if (rpcError || row?.ok === false) {
    return {
      error: `Reembolso feito no Mercado Pago, mas o pedido não foi atualizado (${rpcError?.message ?? row?.error}). Use "Atualizar pagamento".`,
    };
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedido.id}`);
  return { ok: true, info: "Pedido reembolsado. Estoque e cashback ajustados." };
}
