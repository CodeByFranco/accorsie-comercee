import { cache } from "react";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/services/supabase/admin";
import type { AdminPedidoDetailWithItens } from "@/types/pedido";

/**
 * Detalhe completo + itens para o admin (service role). Inclui e-mail do usuário quando a API admin permitir.
 */
export const getPedidoAdminByIdWithItens = cache(async function getPedidoAdminByIdWithItens(
  pedidoId: string
): Promise<AdminPedidoDetailWithItens | null> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      `
      id,
      user_id,
      status,
      subtotal,
      frete,
      retirada_loja,
      tele_rapida,
      total,
      created_at,
      destinatario_nome,
      destinatario_documento,
      telefone,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      mercadopago_preference_id,
      mercadopago_status,
      mercadopago_payment_id,
      rastreio_codigo,
      rastreio_url,
      transportadora_nome,
      melhor_envio_id,
      melhor_envio_etiqueta_url,
      frete_provedor,
      logistica_status,
      cancelamento_motivo,
      reembolso_valor,
      reembolsado_em,
      devolucao_status,
      devolucao_motivo,
      devolucao_rastreio,
      devolucao_solicitada_em,
      devolucao_recebida_em,
      pedido_itens (
        id,
        produto_id,
        quantidade,
        preco_unitario,
        titulo_snapshot,
        cod_produto_snapshot
      )
    `
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    console.error("getPedidoAdminByIdWithItens:", error.message);
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const row = data as AdminPedidoDetailWithItens;
  const itens = Array.isArray(row.pedido_itens) ? row.pedido_itens : [];
  const sorted = [...itens].sort((a, b) =>
    a.titulo_snapshot.localeCompare(b.titulo_snapshot, "pt-BR", { sensitivity: "base" })
  );

  let cliente_email: string | null = null;
  try {
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(row.user_id);
    if (!userErr && userData.user?.email) {
      cliente_email = userData.user.email;
    }
  } catch {
    cliente_email = null;
  }

  let codigo_ui: number | null = null;
  try {
    const { count: olderCount } = await supabase
      .from("pedidos")
      .select("id", { head: true, count: "exact" })
      .lt("created_at", row.created_at);

    const { count: sameMomentCount } = await supabase
      .from("pedidos")
      .select("id", { head: true, count: "exact" })
      .eq("created_at", row.created_at)
      .lte("id", row.id);

    const a = olderCount ?? 0;
    const b = sameMomentCount ?? 0;
    codigo_ui = a + b;
  } catch {
    codigo_ui = null;
  }

  return { ...row, pedido_itens: sorted, cliente_email, codigo_ui };
});
