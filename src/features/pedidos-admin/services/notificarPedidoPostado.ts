import { sendPedidoTransactionalEmail } from "@/services/email/transactionalPedidoEmail";
import { createAdminClient } from "@/services/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Envia o e-mail "pedido enviado" (idempotente no banco) se o pedido estiver postado. */
export async function notificarSePostado(supabase: AdminClient, pedidoId: string): Promise<void> {
  try {
    const { data: pedidoEmail } = await supabase
      .from("pedidos")
      .select("user_id, total, logistica_status, rastreio_codigo, rastreio_url")
      .eq("id", pedidoId)
      .maybeSingle();

    if (pedidoEmail?.user_id && pedidoEmail.logistica_status === "postado") {
      const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(pedidoEmail.user_id);
      if (!authErr && authUser?.user?.email) {
        await sendPedidoTransactionalEmail(supabase, {
          pedidoId,
          kind: "pedido_enviado",
          toEmail: authUser.user.email,
          total: pedidoEmail.total as string | number | null,
          trackingCode: pedidoEmail.rastreio_codigo,
          trackingUrl: pedidoEmail.rastreio_url,
        });
      }
    }
  } catch (emailError) {
    console.error("notificarSePostado:", emailError instanceof Error ? emailError.message : emailError);
  }
}
