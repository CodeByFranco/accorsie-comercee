import { notificarSePostado } from "@/features/pedidos-admin/services/notificarPedidoPostado";
import { sincronizarPagamentoMercadoPagoPedido } from "@/features/pedidos-admin/services/sincronizarPagamentoMercadoPagoPedido";
import { ensureMelhorEnvioAccessToken } from "@/services/melhorEnvio";
import { fetchShipmentTracking } from "@/services/melhorEnvio/melhorEnvioClient";
import { createAdminClient } from "@/services/supabase/admin";

const DIA_MS = 24 * 60 * 60 * 1000;

export type SincronizacaoResumo = {
  pagamentos: { verificados: number; alterados: number; erros: number };
  envios: { verificados: number; postados: number; entregues: number; codigos: number; erro?: string };
};

/**
 * Rotina do cron: (1) reconsulta no Mercado Pago pedidos ainda aguardando pagamento;
 * (2) puxa do Melhor Envio código de rastreio e status (postado/entregue) dos envios em andamento.
 */
export async function sincronizarPedidosAutomatico(): Promise<SincronizacaoResumo> {
  const admin = createAdminClient();
  const resumo: SincronizacaoResumo = {
    pagamentos: { verificados: 0, alterados: 0, erros: 0 },
    envios: { verificados: 0, postados: 0, entregues: 0, codigos: 0 },
  };

  // 1) Pagamentos: pedidos dos últimos 3 dias ainda aguardando (o webhook pode ter falhado).
  const { data: aguardando } = await admin
    .from("pedidos")
    .select("id")
    .eq("status", "aguardando_pagamento")
    .gte("created_at", new Date(Date.now() - 3 * DIA_MS).toISOString())
    .lte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  for (const p of aguardando ?? []) {
    resumo.pagamentos.verificados++;
    try {
      const r = await sincronizarPagamentoMercadoPagoPedido(p.id as string);
      if (r.ok && r.action && r.action !== "noop") resumo.pagamentos.alterados++;
    } catch (e) {
      resumo.pagamentos.erros++;
      console.error("[cron] pagamento", p.id, e instanceof Error ? e.message : e);
    }
  }

  // 2) Envios: pedidos pagos com etiqueta no Melhor Envio e ainda não entregues.
  const { data: envios } = await admin
    .from("pedidos")
    .select("id, melhor_envio_id, logistica_status, rastreio_codigo, rastreio_url")
    .eq("status", "pago")
    .eq("retirada_loja", false)
    .not("melhor_envio_id", "is", null)
    .in("logistica_status", ["nao_iniciado", "em_separacao", "postado"])
    .gte("created_at", new Date(Date.now() - 60 * DIA_MS).toISOString())
    .limit(100);

  if (!envios?.length) return resumo;

  let token: string;
  try {
    token = await ensureMelhorEnvioAccessToken();
  } catch (e) {
    resumo.envios.erro = e instanceof Error ? e.message : "Sem credenciais do Melhor Envio.";
    return resumo;
  }

  const tracking = await fetchShipmentTracking(
    envios.map((e) => String(e.melhor_envio_id)),
    token,
  );
  if (!tracking.ok) {
    resumo.envios.erro = tracking.message;
    return resumo;
  }

  for (const pedido of envios) {
    const info = tracking.byId[String(pedido.melhor_envio_id).trim()];
    if (!info) continue;
    resumo.envios.verificados++;

    const patch: Record<string, string> = {};
    const codigo = info.tracking ?? null;
    if (codigo && codigo !== pedido.rastreio_codigo) {
      patch.rastreio_codigo = codigo;
      resumo.envios.codigos++;
    }
    const rastreioRef = codigo ?? info.melhorenvioTracking;
    if (!pedido.rastreio_url && rastreioRef) {
      patch.rastreio_url = `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(rastreioRef)}`;
    }

    const st = info.status;
    if ((st === "delivered" || info.deliveredAt) && pedido.logistica_status !== "entregue") {
      patch.logistica_status = "entregue";
      resumo.envios.entregues++;
    } else if (
      (st === "posted" || info.postedAt) &&
      st !== "delivered" &&
      pedido.logistica_status !== "postado"
    ) {
      patch.logistica_status = "postado";
      resumo.envios.postados++;
    }

    if (Object.keys(patch).length === 0) continue;

    const { data, error } = await admin.rpc("admin_atualizar_pedido_logistica", {
      p_pedido_id: pedido.id,
      p_patch: patch,
    });
    const row = data as { ok?: boolean; error?: string } | null;
    if (error || !row?.ok) {
      console.error("[cron] logística", pedido.id, error?.message ?? row?.error);
      continue;
    }

    // E-mail "pedido enviado" sai quando vira postado, ou quando o código aparece depois.
    if (patch.logistica_status === "postado" || (patch.rastreio_codigo && pedido.logistica_status === "postado")) {
      await notificarSePostado(admin, pedido.id as string);
    }
  }

  return resumo;
}
