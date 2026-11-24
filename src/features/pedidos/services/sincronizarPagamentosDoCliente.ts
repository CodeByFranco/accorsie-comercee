import { sincronizarPagamentoMercadoPagoPedido } from "@/features/pedidos-admin/services/sincronizarPagamentoMercadoPagoPedido";
import { createAdminClient } from "@/services/supabase/admin";

const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Reconsulta no Mercado Pago os pedidos do próprio cliente ainda aguardando pagamento.
 * Garante que o status apareça atualizado mesmo se o webhook do MP falhar ou atrasar.
 * Nunca lança: falhas só ficam no log.
 */
export async function sincronizarPagamentosDoCliente(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("pedidos")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "aguardando_pagamento")
      .gte("created_at", new Date(Date.now() - TRES_DIAS_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    await Promise.all(
      (data ?? []).map((p) =>
        sincronizarPagamentoMercadoPagoPedido(p.id as string).catch((e: unknown) => {
          console.error("[pagamento] sync cliente", p.id, e instanceof Error ? e.message : e);
        }),
      ),
    );
  } catch (e) {
    console.error("[pagamento] sync cliente:", e instanceof Error ? e.message : e);
  }
}
