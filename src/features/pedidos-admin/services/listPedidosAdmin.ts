import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/services/supabase/admin";
import type { AdminPedidoListRow } from "@/types/pedido";

/**
 * Lista todos os pedidos (painel admin), mais recentes primeiro, com `codigo_ui` sequencial.
 * Exige `SUPABASE_SERVICE_ROLE_KEY`.
 */
export async function listPedidosAdmin(): Promise<AdminPedidoListRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "id, user_id, status, total, created_at, destinatario_nome, destinatario_documento, logistica_status, rastreio_codigo, retirada_loja, devolucao_status",
    )
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("listPedidosAdmin:", error.message);
    throw new Error(error.message);
  }
  const rows = (data ?? []) as AdminPedidoListRow[];
  return rows.map((row, i) => ({ ...row, codigo_ui: i + 1 })).reverse();
}
