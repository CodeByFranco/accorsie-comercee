"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { sendPedidoTransactionalEmail } from "@/services/email/transactionalPedidoEmail";
import { createAdminClient } from "@/services/supabase/admin";

export type AtualizarPedidoLogisticaState = { ok?: boolean; error?: string };

function buildPatch(formData: FormData): Record<string, string | boolean | null> {
  const str = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };

  const retiradaRaw = formData.get("retirada_loja");
  const retirada_loja = retiradaRaw === "on" || retiradaRaw === "1" || retiradaRaw === "true";

  return {
    destinatario_documento: str("destinatario_documento"),
    rastreio_codigo: str("rastreio_codigo"),
    rastreio_url: str("rastreio_url"),
    transportadora_nome: str("transportadora_nome"),
    melhor_envio_id: str("melhor_envio_id"),
    melhor_envio_etiqueta_url: str("melhor_envio_etiqueta_url"),
    frete_provedor: str("frete_provedor"),
    logistica_status: str("logistica_status"),
    retirada_loja,
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

const FRIENDLY: Record<string, string> = {
  pedido_nao_encontrado: "Pedido não encontrado.",
  patch_chave_invalida: "Dados inválidos.",
  logistica_status_invalido: "Status de logística inválido.",
  frete_provedor_invalido: "Origem do frete inválida.",
  retirada_loja_invalida: "Valor inválido para retirada na loja.",
};

async function notificarSePostado(supabase: AdminClient, pedidoId: string): Promise<void> {
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
  console.error(
    "atualizarPedidoLogisticaAction email:",
    emailError instanceof Error ? emailError.message : emailError,
  );
}
}

const STATUS_VALIDOS = new Set(["nao_iniciado", "em_separacao", "postado", "entregue"]);

/** Ação rápida do detalhe do pedido: muda status de envio e/ou retirada na loja. */
export async function definirLogisticaPedidoAction(input: {
  pedidoId: string;
  logisticaStatus?: string;
  retiradaLoja?: boolean;
}): Promise<AtualizarPedidoLogisticaState> {
  await requireAdmin();
  const patch: Record<string, string | boolean> = {};
  if (input.logisticaStatus !== undefined) {
    if (!STATUS_VALIDOS.has(input.logisticaStatus)) return { error: "Status inválido." };
    patch.logistica_status = input.logisticaStatus;
  }
  if (input.retiradaLoja !== undefined) patch.retirada_loja = input.retiradaLoja;
  if (!input.pedidoId || Object.keys(patch).length === 0) return { error: "Nada para salvar." };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_atualizar_pedido_logistica", {
    p_pedido_id: input.pedidoId,
    p_patch: patch,
  });
  if (error) return { error: error.message };
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    const code = result?.error ?? "erro_desconhecido";
    return { error: FRIENDLY[code] ?? `Não foi possível salvar (${code}).` };
  }

  if (patch.logistica_status === "postado") await notificarSePostado(supabase, input.pedidoId);

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${input.pedidoId}`);
  return { ok: true };
}

export async function atualizarPedidoLogisticaAction(
  _prev: AtualizarPedidoLogisticaState | null,
  formData: FormData
): Promise<AtualizarPedidoLogisticaState> {
  await requireAdmin();
  const pedidoId = String(formData.get("pedido_id") ?? "").trim();
  if (!pedidoId) {
    return { error: "Pedido inválido." };
  }

  const patch = buildPatch(formData);
  if (!patch.logistica_status) {
    return { error: "Selecione o status de logística." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_atualizar_pedido_logistica", {
    p_pedido_id: pedidoId,
    p_patch: patch,
  });

  if (error) {
    console.error("atualizarPedidoLogisticaAction:", error.message);
    return { error: error.message };
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    const code = result?.error ?? "erro_desconhecido";
    const friendly: Record<string, string> = {
      pedido_nao_encontrado: "Pedido não encontrado.",
      patch_chave_invalida: "Dados inválidos.",
      logistica_status_invalido: "Status de logística inválido.",
      frete_provedor_invalido: "Origem do frete inválida.",
      retirada_loja_invalida: "Valor inválido para retirada na loja.",
    };
    return { error: friendly[code] ?? `Não foi possível salvar (${code}).` };
  }

  await notificarSePostado(supabase, pedidoId);

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  return { ok: true };
}
