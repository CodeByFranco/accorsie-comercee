"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { sendPedidoTransactionalEmail } from "@/services/email/transactionalPedidoEmail";
import { cancelShipment, ensureMelhorEnvioAccessToken } from "@/services/melhorEnvio";
import { refundPayment } from "@/services/mercadopago/client";
import { createAdminClient } from "@/services/supabase/admin";
import type { PedidoLogisticaStatus } from "@/types/pedido";

export type ReembolsarPedidoActionState = {
  ok?: boolean;
  error?: string;
  info?: string;
};

type AdminClient = ReturnType<typeof createAdminClient>;

const JA_ENVIADO: PedidoLogisticaStatus[] = ["postado", "entregue"];

function texto(formData: FormData, campo: string, max = 500): string {
  return String(formData.get(campo) ?? "").trim().slice(0, max);
}

function revalidar(pedidoId: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath(`/pedidos/${pedidoId}`);
}

async function carregarPedido(admin: AdminClient, pedidoId: string) {
  const { data } = await admin
    .from("pedidos")
    .select(
      "id, user_id, status, total, frete, logistica_status, retirada_loja, melhor_envio_id, mercadopago_payment_id, devolucao_status",
    )
    .eq("id", pedidoId)
    .maybeSingle();
  return data;
}

/** Estorna no Mercado Pago e marca o pedido como reembolsado (triggers ajustam cashback e, antes do envio, estoque). */
async function estornar(
  admin: AdminClient,
  pedido: { id: string; mercadopago_payment_id: string | null },
  opts: { valor?: number; chave: string },
): Promise<{ error: string } | null> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) return { error: "Servidor sem MERCADOPAGO_ACCESS_TOKEN." };

  const paymentId = pedido.mercadopago_payment_id?.trim() ?? "";
  if (!paymentId) {
    return { error: 'Pedido sem ID de pagamento do Mercado Pago. Use "Atualizar pagamento" primeiro.' };
  }

  const mp = await refundPayment(paymentId, { accessToken, idempotencyKey: opts.chave, amount: opts.valor });
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
  return null;
}

async function avisarCliente(admin: AdminClient, pedidoId: string, userId: string, valor: number) {
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    await sendPedidoTransactionalEmail(admin, {
      pedidoId,
      kind: "pedido_reembolsado",
      toEmail: authUser?.user?.email,
      total: valor,
    });
  } catch (e) {
    console.error("avisarCliente reembolso:", e instanceof Error ? e.message : e);
  }
}

/**
 * Cancelamento antes do envio: cancela a etiqueta no Melhor Envio (se houver),
 * estorna o valor total e devolve o estoque.
 */
export async function reembolsarPedidoAction(
  _prev: ReembolsarPedidoActionState | null,
  formData: FormData,
): Promise<ReembolsarPedidoActionState> {
  await requireAdmin();
  const pedidoId = texto(formData, "pedido_id", 64);
  const motivo = texto(formData, "motivo");
  if (!pedidoId) return { error: "Pedido inválido." };
  if (!motivo) return { error: "Informe o motivo do cancelamento." };

  const admin = createAdminClient();
  const pedido = await carregarPedido(admin, pedidoId);
  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.status !== "pago") return { error: "Só é possível cancelar pedidos pagos." };
  if (JA_ENVIADO.includes(pedido.logistica_status as PedidoLogisticaStatus)) {
    return { error: "Este pedido já saiu da loja. Use o fluxo de devolução." };
  }

  const meId = (pedido.melhor_envio_id as string | null)?.trim();
  let etiquetaInfo = "";
  if (meId && !pedido.retirada_loja) {
    try {
      const token = await ensureMelhorEnvioAccessToken();
      const cancel = await cancelShipment(meId, token);
      if (!cancel.ok) {
        return {
          error: `Não foi possível cancelar a etiqueta no Melhor Envio (${cancel.message}). Cancele por lá e tente novamente.`,
        };
      }
      etiquetaInfo = " Etiqueta cancelada e frete devolvido à carteira do Melhor Envio.";
    } catch (e) {
      return { error: `Melhor Envio indisponível: ${e instanceof Error ? e.message : "erro desconhecido"}.` };
    }
  }

  const total = Number(pedido.total);
  const falha = await estornar(admin, pedido, { chave: `reembolso-${pedido.id}` });
  if (falha) return falha;

  await admin
    .from("pedidos")
    .update({
      cancelamento_motivo: motivo,
      reembolso_valor: total,
      reembolsado_em: new Date().toISOString(),
    })
    .eq("id", pedido.id);

  await avisarCliente(admin, pedido.id, pedido.user_id as string, total);
  revalidar(pedido.id);
  return { ok: true, info: `Pedido cancelado e reembolsado. Estoque e cashback ajustados.${etiquetaInfo}` };
}

/** Pedido já enviado: abre a devolução. O reembolso só sai na conferência da peça. */
export async function iniciarDevolucaoAction(
  _prev: ReembolsarPedidoActionState | null,
  formData: FormData,
): Promise<ReembolsarPedidoActionState> {
  await requireAdmin();
  const pedidoId = texto(formData, "pedido_id", 64);
  const motivo = texto(formData, "motivo");
  const rastreio = texto(formData, "rastreio", 60);
  if (!pedidoId) return { error: "Pedido inválido." };
  if (!motivo) return { error: "Informe o motivo da devolução." };

  const admin = createAdminClient();
  const pedido = await carregarPedido(admin, pedidoId);
  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.status !== "pago") return { error: "Só é possível abrir devolução de pedidos pagos." };
  if (pedido.devolucao_status) return { error: "Este pedido já tem uma devolução aberta." };
  if (!JA_ENVIADO.includes(pedido.logistica_status as PedidoLogisticaStatus)) {
    return { error: "O pedido ainda não saiu da loja. Use o cancelamento com reembolso." };
  }

  const { error } = await admin
    .from("pedidos")
    .update({
      devolucao_status: "aguardando_retorno",
      devolucao_motivo: motivo,
      devolucao_rastreio: rastreio || null,
      devolucao_solicitada_em: new Date().toISOString(),
    })
    .eq("id", pedido.id);
  if (error) return { error: "Não foi possível abrir a devolução." };

  revalidar(pedido.id);
  return { ok: true, info: "Devolução aberta. Confirme o recebimento quando a peça chegar." };
}

/** Atualiza o código de rastreio da devolução. */
export async function atualizarRastreioDevolucaoAction(
  _prev: ReembolsarPedidoActionState | null,
  formData: FormData,
): Promise<ReembolsarPedidoActionState> {
  await requireAdmin();
  const pedidoId = texto(formData, "pedido_id", 64);
  const rastreio = texto(formData, "rastreio", 60);
  const admin = createAdminClient();
  const { error } = await admin
    .from("pedidos")
    .update({ devolucao_rastreio: rastreio || null })
    .eq("id", pedidoId)
    .eq("devolucao_status", "aguardando_retorno");
  if (error) return { error: "Não foi possível salvar o rastreio." };
  revalidar(pedidoId);
  return { ok: true, info: "Rastreio da devolução salvo." };
}

/** Desiste da devolução (cliente desistiu, peça não voltou etc.). */
export async function cancelarDevolucaoAction(
  _prev: ReembolsarPedidoActionState | null,
  formData: FormData,
): Promise<ReembolsarPedidoActionState> {
  await requireAdmin();
  const pedidoId = texto(formData, "pedido_id", 64);
  const admin = createAdminClient();
  const { error } = await admin
    .from("pedidos")
    .update({ devolucao_status: null, devolucao_rastreio: null, devolucao_solicitada_em: null })
    .eq("id", pedidoId)
    .eq("status", "pago")
    .eq("devolucao_status", "aguardando_retorno");
  if (error) return { error: "Não foi possível encerrar a devolução." };
  revalidar(pedidoId);
  return { ok: true, info: "Devolução encerrada sem reembolso." };
}

/**
 * Peça recebida e conferida: estorna o valor escolhido e repõe no estoque só os itens marcados.
 * `valor_tipo`: total | produtos (sem frete) | outro (`valor_outro`).
 * `repor_<itemId>`: quantidade que volta ao estoque.
 */
export async function concluirDevolucaoAction(
  _prev: ReembolsarPedidoActionState | null,
  formData: FormData,
): Promise<ReembolsarPedidoActionState> {
  await requireAdmin();
  const pedidoId = texto(formData, "pedido_id", 64);
  const tipo = texto(formData, "valor_tipo", 20);

  const admin = createAdminClient();
  const pedido = await carregarPedido(admin, pedidoId);
  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.status !== "pago" || pedido.devolucao_status !== "aguardando_retorno") {
    return { error: "Este pedido não tem devolução aguardando retorno." };
  }

  const total = Number(pedido.total);
  const frete = Number(pedido.frete) || 0;
  let valor = total;
  if (tipo === "produtos") valor = Math.max(total - frete, 0);
  if (tipo === "outro") valor = Number(texto(formData, "valor_outro", 20).replace(/\./g, "").replace(",", "."));
  valor = Math.round(valor * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe um valor de reembolso válido." };
  if (valor > total) return { error: "O reembolso não pode passar do total do pedido." };

  const itens: { item_id: string; quantidade: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("repor_")) continue;
    const quantidade = Math.max(0, Math.floor(Number(v)));
    if (quantidade > 0) itens.push({ item_id: k.slice(6), quantidade });
  }

  const parcial = valor < total;
  const falha = await estornar(admin, pedido, {
    valor: parcial ? valor : undefined,
    chave: `devolucao-${pedido.id}-${Math.round(valor * 100)}`,
  });
  if (falha) return falha;

  await admin
    .from("pedidos")
    .update({
      devolucao_status: "recebida",
      devolucao_recebida_em: new Date().toISOString(),
      cancelamento_motivo: "Devolução",
      reembolso_valor: valor,
      reembolsado_em: new Date().toISOString(),
    })
    .eq("id", pedido.id);

  let repostos = 0;
  if (itens.length > 0) {
    const { data, error } = await admin.rpc("admin_pedido_devolucao_repor_estoque", {
      p_pedido_id: pedido.id,
      p_itens: itens,
    });
    if (error) {
      revalidar(pedido.id);
      return { error: `Reembolso feito, mas o estoque não foi reposto (${error.message}). Ajuste no cadastro do produto.` };
    }
    repostos = Number(data) || 0;
  }

  await avisarCliente(admin, pedido.id, pedido.user_id as string, valor);
  revalidar(pedido.id);
  const estoque = repostos > 0 ? ` ${repostos} peça(s) de volta ao estoque.` : " Nenhuma peça voltou ao estoque.";
  return { ok: true, info: `Devolução concluída e reembolso realizado.${estoque}` };
}
