"use server";

import { redirect } from "next/navigation";

import type { CheckoutPayload } from "@/features/checkout/types";
import { getStorePickupAddress } from "@/config/storePickupAddress";
import { createAdminClient } from "@/services/supabase/admin";
import { createClient } from "@/services/supabase/server";
import { createPreference, isTestAccessToken, pickInitPoint } from "@/services/mercadopago/client";
import { sendPedidoTransactionalEmail } from "@/services/email/transactionalPedidoEmail";
import { buildMercadoPagoPreferenceItems } from "@/features/checkout/utils/buildMercadoPagoPreferenceItems";
import {
  fetchCheckoutSomenteRetiradaFlags,
  validateCheckoutEntregaPayload,
} from "@/features/checkout/utils/validateCheckoutEntrega";

export type CriarPedidoCheckoutError = { ok: false; message: string };

type PedidoItemRow = {
  titulo_snapshot: string;
  cod_produto_snapshot: string;
  quantidade: number;
  preco_unitario: string | number;
};

type PedidoCheckoutRow = {
  frete: string | number;
  subtotal: string | number;
  total: string | number;
  desconto_cupom: string | number | null;
};

function resolveAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/+$/, "");
  }
  throw new Error(
    "Defina NEXT_PUBLIC_APP_URL (URL pública do site) para montar as URLs do checkout Mercado Pago.",
  );
}

/** Com credenciais de produção, o MP exige HTTPS para validar `auto_return` e `notification_url`. */
function isHttpsAppBaseUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeMoney(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Valor monetário inválido ao montar o checkout.");
  }
  return Math.round(n * 100) / 100;
}

function validatePayload(payload: CheckoutPayload): string | null {
  if (!payload.itens || !Array.isArray(payload.itens) || payload.itens.length === 0) {
    return "Adicione ao menos um produto ao carrinho.";
  }
  for (const line of payload.itens) {
    if (!line.produto_id || typeof line.produto_id !== "string") {
      return "Item do carrinho inválido (produto).";
    }
    const q = line.quantidade;
    if (typeof q !== "number" || !Number.isInteger(q) || q < 1) {
      return "Quantidade inválida em um dos itens.";
    }
  }
  const retirada = payload.retirada_loja === true;
  const frete = Number(payload.frete);
  if (retirada) {
    if (!Number.isFinite(frete) || frete !== 0) {
      return "Retirada na loja não inclui frete.";
    }
    if (typeof payload.destinatario_nome !== "string" || !payload.destinatario_nome.trim()) {
      return "Informe o nome completo para retirada na loja.";
    }
    if (typeof payload.telefone !== "string" || !payload.telefone.trim()) {
      return "Informe um telefone para contato.";
    }
  } else {
    if (!Number.isFinite(frete) || frete <= 0) {
      return "Selecione uma opção de frete válida antes de finalizar.";
    }
    const required = [
      ["destinatario_nome", payload.destinatario_nome],
      ["telefone", payload.telefone],
      ["cep", payload.cep],
      ["logradouro", payload.logradouro],
      ["numero", payload.numero],
      ["bairro", payload.bairro],
      ["cidade", payload.cidade],
      ["uf", payload.uf],
    ] as const;
    for (const [, v] of required) {
      if (typeof v !== "string" || !v.trim()) {
        return "Preencha todos os dados obrigatórios de entrega.";
      }
    }
    const doc = (payload.destinatario_documento ?? "").replace(/\D/g, "").trim();
    if (doc.length !== 11 && doc.length !== 14) {
      return "Informe CPF (11 dígitos) ou CNPJ (14 dígitos) do destinatário para entrega.";
    }
  }
  const fp = payload.forma_pagamento;
  if (fp !== "pix" && fp !== "cartao") {
    return "Selecione a forma de pagamento (PIX ou cartão).";
  }
  return null;
}

function rpcErrorMessage(message: string): string {
  if (message.includes("Sessão obrigatória")) {
    return "Faça login para finalizar a compra.";
  }
  if (message.includes("Estoque insuficiente")) {
    return "Estoque insuficiente para um ou mais itens. Atualize o carrinho e tente novamente.";
  }
  if (message.includes("não foram encontrados")) {
    return "Um ou mais produtos não estão mais disponíveis.";
  }
  if (message.includes("apenas para retirada na loja")) {
    return "Este pedido contém produtos disponíveis apenas para retirada na loja.";
  }
  return message;
}

/**
 * Cria o pedido no Supabase (RPC com lock de estoque), abre uma Preference no Mercado Pago
 * e redireciona o cliente para o `init_point` (via `redirect()` do Next.js).
 * Em caso de erro retorna `{ ok: false, message }`.
 */
export async function criarPedidoECheckout(
  payload: CheckoutPayload,
): Promise<CriarPedidoCheckoutError> {
  const validationError = validatePayload(payload);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return {
      ok: false,
      message: "Pagamentos temporariamente indisponíveis (configuração do servidor).",
    };
  }

  let baseUrl: string;
  try {
    baseUrl = resolveAppBaseUrl();
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "Defina NEXT_PUBLIC_APP_URL no .env.local (ex.: http://localhost:3000).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Sessão expirada ou inválida. Faça login novamente." };
  }

  const p_itens = payload.itens.map((l) => ({
    produto_id: l.produto_id.trim(),
    quantidade: l.quantidade,
  }));

  const forma = payload.forma_pagamento === "pix" ? "pix" : "cartao";
  const retirada = payload.retirada_loja === true;
  const freteInformado = Number(payload.frete);

  const entregaFlags = await fetchCheckoutSomenteRetiradaFlags(
    supabase,
    p_itens.map((l) => l.produto_id),
  );
  if (entregaFlags.error) {
    return { ok: false, message: entregaFlags.error };
  }
  const entregaError = validateCheckoutEntregaPayload(
    retirada,
    freteInformado,
    entregaFlags.hasSomenteRetirada,
  );
  if (entregaError) {
    return { ok: false, message: entregaError };
  }

  const loja = retirada ? getStorePickupAddress() : null;
  if (retirada && !loja) {
    return {
      ok: false,
      message:
        "Retirada na loja não está configurada no servidor. Use a entrega no endereço ou entre em contato com a loja.",
    };
  }

  const destNome = payload.destinatario_nome.trim();
  const tel = payload.telefone.trim();
  const cep = loja ? loja.cep : payload.cep.trim();
  const logradouro = loja ? loja.logradouro : payload.logradouro.trim();
  const numero = loja ? loja.numero : payload.numero.trim();
  const complemento = loja ? loja.complemento : (payload.complemento ?? "").trim();
  const bairro = loja ? loja.bairro : payload.bairro.trim();
  const cidade = loja ? loja.cidade : payload.cidade.trim();
  const uf = loja ? loja.uf : payload.uf.trim();

  const docOpt = (payload.destinatario_documento ?? "").replace(/\D/g, "").trim();
  const p_destinatario_documento =
    !retirada && (docOpt.length === 11 || docOpt.length === 14) ? docOpt : null;

  const cupomRaw = (payload.cupom_codigo ?? "").trim();
  const { data: pedidoIdRaw, error: rpcError } = await supabase.rpc("criar_pedido_checkout", {
    p_itens,
    p_frete: retirada ? 0 : payload.frete,
    p_destinatario_nome: destNome,
    p_telefone: tel,
    p_cep: cep,
    p_logradouro: logradouro,
    p_numero: numero,
    p_complemento: complemento,
    p_bairro: bairro,
    p_cidade: cidade,
    p_uf: uf,
    p_forma_pagamento: forma,
    p_destinatario_documento,
    p_retirada_loja: retirada,
    p_cupom_codigo: cupomRaw || null,
  });

  if (rpcError) {
    return {
      ok: false,
      message: rpcErrorMessage(rpcError.message || "Não foi possível criar o pedido."),
    };
  }

  let pedidoId: string | null = null;
  if (typeof pedidoIdRaw === "string") {
    pedidoId = pedidoIdRaw;
  } else if (Array.isArray(pedidoIdRaw) && typeof pedidoIdRaw[0] === "string") {
    pedidoId = pedidoIdRaw[0];
  }

  if (!pedidoId) {
    return { ok: false, message: "Resposta inesperada ao criar o pedido. Tente novamente." };
  }

  const { data: itensRows, error: itensError } = await supabase
    .from("pedido_itens")
    .select("titulo_snapshot, cod_produto_snapshot, quantidade, preco_unitario")
    .eq("pedido_id", pedidoId);

  if (itensError || !itensRows?.length) {
    return {
      ok: false,
      message: "Pedido criado, mas não foi possível carregar os itens para o pagamento. Entre em contato.",
    };
  }

  const itens = itensRows as PedidoItemRow[];

  const { data: pedidoRow, error: pedidoError } = await supabase
    .from("pedidos")
    .select("frete, subtotal, total, desconto_cupom")
    .eq("id", pedidoId)
    .single();

  if (pedidoError || !pedidoRow) {
    return {
      ok: false,
      message: "Não foi possível confirmar o frete do pedido. Tente novamente.",
    };
  }

  const pedidoVals = pedidoRow as PedidoCheckoutRow;
  const freteValor = normalizeMoney(pedidoVals.frete);
  const descontoCupomVal = normalizeMoney(pedidoVals.desconto_cupom ?? 0);

  const preferenceItems = buildMercadoPagoPreferenceItems(
    itens,
    freteValor,
    normalizeMoney(pedidoVals.subtotal),
    normalizeMoney(pedidoVals.frete),
    normalizeMoney(pedidoVals.total),
    descontoCupomVal,
  );

  const preferenceBody: Record<string, unknown> = {
    items: preferenceItems,
    external_reference: pedidoId,
    metadata: { pedido_id: pedidoId },
    /** Limite de parcelas no checkout (alinha com texto na página do produto). */
    payment_methods: { installments: 3 },
    back_urls: {
      success: `${baseUrl}/checkout/retorno?status=success`,
      failure: `${baseUrl}/checkout/retorno?status=failure`,
      pending: `${baseUrl}/checkout/retorno?status=pending`,
    },
  };

  if (user.email) {
    preferenceBody.payer = { email: user.email };
  }

  const mpHttps = isHttpsAppBaseUrl(baseUrl);
  const sandboxToken = isTestAccessToken(accessToken);
  if (mpHttps || sandboxToken) {
    preferenceBody.auto_return = "approved";
    preferenceBody.notification_url = `${baseUrl}/api/webhooks/mercadopago`;
  }

  const mpResult = await createPreference(preferenceBody, {
    accessToken,
    idempotencyKey: pedidoId,
  });

  if (!mpResult.ok) {
    return {
      ok: false,
      message: `Não foi possível iniciar o pagamento: ${mpResult.detail}`,
    };
  }

  const mpJson = mpResult.data;

  const preferenceId = mpJson.id;
  if (!preferenceId) {
    return { ok: false, message: "Resposta do Mercado Pago sem identificador da preferência." };
  }

  let initPoint: string;
  try {
    initPoint = pickInitPoint(mpJson, accessToken);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "URL de checkout indisponível.",
    };
  }

  try {
    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("pedidos")
      .update({ mercadopago_preference_id: preferenceId })
      .eq("id", pedidoId)
      .eq("user_id", user.id);

    if (updateError) {
      return {
        ok: false,
        message: `Pedido registrado, mas falhou ao salvar o link de pagamento: ${updateError.message}`,
      };
    }

    try {
      await sendPedidoTransactionalEmail(admin, {
        pedidoId,
        kind: "pedido_criado",
        toEmail: user.email,
        total: pedidoVals.total,
      });
    } catch (e) {
      console.error("[email] pedido criado:", e instanceof Error ? e.message : e);
    }
  } catch {
    return {
      ok: false,
      message:
        "Defina SUPABASE_SERVICE_ROLE_KEY no servidor para concluir o checkout, ou tente novamente.",
    };
  }

  redirect(initPoint);
}
