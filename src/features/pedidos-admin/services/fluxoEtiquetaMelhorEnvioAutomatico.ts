import { getMelhorEnvioRemetenteFromEnv, onlyDigits } from "@/config/melhorEnvioRemetente";
import type { MelhorEnvioQuoteLine, MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";
import {
  addShipmentToMelhorEnvioCart,
  ensureMelhorEnvioAccessToken,
  generateShipmentLabel,
  purchaseShipment,
  quoteShipment,
} from "@/services/melhorEnvio";
import {
  type EmbalagemRow,
  type ProdutoFreteRow,
  rowToQuoteLine,
} from "@/services/melhorEnvio/freteQuoteLinesFromRows";
import { createAdminClient } from "@/services/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FluxoEtiquetaAutomaticoResult =
  | { ok: true; message: string; etiquetaUrl?: string; melhorEnvioId: string }
  | { ok: false; message: string };

function normalizeCep8(raw: string): string | null {
  const d = onlyDigits(raw);
  return d.length === 8 ? d : null;
}

function fretePedidoToCentavos(frete: unknown): number {
  const n = typeof frete === "number" ? frete : Number(String(frete ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return -1;
  return Math.round(n * 100);
}

function pickOpcaoPorFrete(
  opcoes: MelhorEnvioQuoteOption[],
  freteCentavos: number,
): MelhorEnvioQuoteOption | null {
  if (freteCentavos < 0 || opcoes.length === 0) return null;
  if (freteCentavos === 0) {
    return [...opcoes].sort((a, b) => a.precoCentavos - b.precoCentavos)[0]!;
  }
  const tolerance = 3;
  const exact = opcoes.filter((o) => Math.abs(o.precoCentavos - freteCentavos) <= tolerance);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) {
    exact.sort((a, b) => a.precoCentavos - b.precoCentavos);
    return exact[0]!;
  }
  return null;
}

function buildVolumesFromLinhas(linhas: MelhorEnvioQuoteLine[]): {
  height: number;
  width: number;
  length: number;
  weight: number;
}[] {
  let weight = 0;
  let h = 0;
  let w = 0;
  let l = 0;
  for (const line of linhas) {
    const d = line.dimensoes;
    weight += d.pesoKg;
    h = Math.max(h, Math.ceil(d.alturaCm));
    w = Math.max(w, Math.ceil(d.larguraCm));
    l = Math.max(l, Math.ceil(d.comprimentoCm));
  }
  const safeWeight = Math.max(Number(weight.toFixed(3)), 0.01);
  return [{ height: Math.max(h, 1), width: Math.max(w, 1), length: Math.max(l, 1), weight: safeWeight }];
}

async function loadQuoteLinesForPedido(
  admin: SupabaseClient,
  pedidoId: string,
): Promise<MelhorEnvioQuoteLine[] | { error: string }> {
  const { data: itens, error: itensErr } = await admin
    .from("pedido_itens")
    .select("produto_id, quantidade")
    .eq("pedido_id", pedidoId);

  if (itensErr || !itens?.length) {
    return { error: "Pedido sem itens." };
  }

  if (itens.some((r) => r.produto_id == null || String(r.produto_id).trim() === "")) {
    return {
      error:
        "Pedido contém itens cujo produto foi removido do catálogo; não é possível calcular frete automático pelas dimensões do produto. Use outro fluxo ou recadastre o item.",
    };
  }

  const ids = [...new Set(itens.map((r) => String(r.produto_id)))];
  const { data: prodRows, error: prodErr } = await admin
    .from("produtos")
    .select(
      "id, valor, quantidade_estoque, prod_comprimento_cm, prod_largura_cm, prod_altura_cm, prod_peso_kg, embalagem_id",
    )
    .in("id", ids);

  if (prodErr || !prodRows?.length) {
    return { error: "Não foi possível carregar produtos do pedido." };
  }

  const rows = prodRows as ProdutoFreteRow[];
  const embIds = [
    ...new Set(rows.map((r) => r.embalagem_id).filter((id): id is string => Boolean(id))),
  ];
  const embalagens = new Map<string, EmbalagemRow>();
  if (embIds.length > 0) {
    const { data: embData, error: embErr } = await admin
      .from("embalagens")
      .select("id, comprimento_cm, largura_cm, altura_cm, peso_embalagem_kg")
      .in("id", embIds);
    if (embErr) {
      return { error: "Não foi possível carregar embalagens." };
    }
    for (const e of (embData ?? []) as EmbalagemRow[]) {
      embalagens.set(e.id, e);
    }
  }

  const qtyByProd = new Map<string, number>();
  for (const row of itens) {
    const pid = String(row.produto_id);
    const q = typeof row.quantidade === "number" ? row.quantidade : Number(row.quantidade);
    if (!Number.isFinite(q) || q < 1) {
      return { error: "Quantidade inválida em item do pedido." };
    }
    qtyByProd.set(pid, (qtyByProd.get(pid) ?? 0) + q);
  }

  const linhas: MelhorEnvioQuoteLine[] = [];
  for (const row of rows) {
    const quantidade = qtyByProd.get(row.id);
    if (quantidade === undefined) continue;
    const built = rowToQuoteLine(row, embalagens, quantidade);
    if (!built.ok) {
      return { error: built.message };
    }
    linhas.push(built.line);
  }

  if (linhas.length === 0) {
    return { error: "Nenhuma linha válida para cotação de frete." };
  }
  return linhas;
}

/**
 * Cota novamente no Melhor Envio, coloca no carrinho, compra com saldo e gera etiqueta — tudo pelo servidor.
 * Grava `melhor_envio_id`, URL da etiqueta, rastreio e transportadora no pedido.
 */
export async function executarFluxoEtiquetaMelhorEnvioAutomatico(
  pedidoId: string,
): Promise<FluxoEtiquetaAutomaticoResult> {
  const rem = getMelhorEnvioRemetenteFromEnv();
  if (!rem.ok) {
    return { ok: false, message: rem.message };
  }

  const cepOrigemRaw = process.env.MELHOR_ENVIO_CEP_ORIGEM?.trim();
  const cepOrigem = cepOrigemRaw ? normalizeCep8(cepOrigemRaw) : null;
  if (!cepOrigem) {
    return { ok: false, message: "Defina MELHOR_ENVIO_CEP_ORIGEM (8 dígitos) no servidor." };
  }

  const admin = createAdminClient();
  const { data: pedido, error: pedidoErr } = await admin
    .from("pedidos")
    .select(
      "id, status, frete, subtotal, retirada_loja, destinatario_nome, destinatario_documento, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, melhor_envio_id, user_id",
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (pedidoErr || !pedido) {
    return { ok: false, message: "Pedido não encontrado." };
  }

  if (pedido.retirada_loja === true) {
    return { ok: false, message: "Pedido é retirada na loja — não há envio Melhor Envio." };
  }

  if (pedido.status !== "pago") {
    return { ok: false, message: "Só é possível gerar etiqueta automática com o pedido pago." };
  }

  const docDest = onlyDigits(String(pedido.destinatario_documento ?? ""));
  if (docDest.length !== 11 && docDest.length !== 14) {
    return {
      ok: false,
      message: "CPF/CNPJ do destinatário não encontrado no pedido. Peça para o cliente preencher no checkout.",
    };
  }

  const cepDest = normalizeCep8(String(pedido.cep ?? ""));
  if (!cepDest) {
    return { ok: false, message: "CEP do pedido inválido." };
  }

  const linesOrErr = await loadQuoteLinesForPedido(admin, pedidoId);
  if ("error" in linesOrErr) {
    return { ok: false, message: linesOrErr.error };
  }
  const linhas = linesOrErr;

  let token: string;
  try {
    token = await ensureMelhorEnvioAccessToken();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao obter token Melhor Envio.";
    return { ok: false, message: msg };
  }

  const quote = await quoteShipment(
    {
      cepOrigem,
      cepDestino: cepDest,
      linhas,
    },
    { token },
  );

  if (!quote.ok) {
    return { ok: false, message: `Cotação Melhor Envio: ${quote.message}` };
  }

  const freteCentavos = fretePedidoToCentavos(pedido.frete);
  const opcao = pickOpcaoPorFrete(quote.opcoes, freteCentavos);
  if (!opcao) {
    const precos = quote.opcoes
      .map((o) => `${o.nome}: R$ ${(o.precoCentavos / 100).toFixed(2)}`)
      .slice(0, 8)
      .join("; ");
    return {
      ok: false,
      message: `Nenhuma cotação atual bate com o frete do pedido (R$ ${(freteCentavos / 100).toFixed(2)}). Ajuste dimensões/produtos ou gere manualmente. Opções: ${precos || "nenhuma"}`,
    };
  }

  const serviceId = Number.parseInt(opcao.id, 10);
  if (!Number.isFinite(serviceId)) {
    return { ok: false, message: "ID de serviço Melhor Envio inválido na cotação." };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(String(pedido.user_id));
  const emailCliente = authUser?.user?.email?.trim() || "cliente@pedido.local";

  const f = rem.from;
  const fromPayload: Record<string, unknown> = {
    name: f.name,
    email: f.email,
    phone: f.phone,
    document: f.document,
    company_document: f.company_document,
    state_register: f.state_register,
    address: f.address,
    complement: f.complement,
    number: f.number,
    district: f.district,
    city: f.city,
    postal_code: f.postal_code,
    state_abbr: f.state_abbr,
    country_id: f.country_id,
  };
  if (f.economic_activity_code) {
    fromPayload.economic_activity_code = f.economic_activity_code;
  }

  const isDestPj = docDest.length === 14;
  const toPayload: Record<string, unknown> = {
    name: String(pedido.destinatario_nome ?? "").trim() || "Destinatário",
    email: emailCliente,
    phone: onlyDigits(String(pedido.telefone ?? "")),
    document: isDestPj ? "" : docDest,
    company_document: isDestPj ? docDest : "",
    state_register: isDestPj ? "" : "ISENTO",
    address: String(pedido.logradouro ?? "").trim(),
    complement: String(pedido.complemento ?? "").trim(),
    number: String(pedido.numero ?? "").trim(),
    district: String(pedido.bairro ?? "").trim(),
    city: String(pedido.cidade ?? "").trim(),
    postal_code: cepDest,
    state_abbr: String(pedido.uf ?? "")
      .toUpperCase()
      .slice(0, 2),
    country_id: "BR",
  };

  const { data: itensDeclaracao, error: ideErr } = await admin
    .from("pedido_itens")
    .select("titulo_snapshot, quantidade, preco_unitario")
    .eq("pedido_id", pedidoId);

  if (ideErr || !itensDeclaracao?.length) {
    return { ok: false, message: "Não foi possível montar declaração de conteúdo (itens)." };
  }

  const products = itensDeclaracao.map((it) => {
    const unit = Number(it.preco_unitario);
    const q = typeof it.quantidade === "number" ? it.quantidade : Number(it.quantidade);
    const unitCent = Number.isFinite(unit) ? Math.max(0, Math.round(unit * 100)) : 0;
    return {
      name: String(it.titulo_snapshot).slice(0, 200),
      quantity: String(Math.max(1, q)),
      unitary_value: String(unitCent),
    };
  });

  const subtotalNum = Number(pedido.subtotal);
  const insuranceValue = Number.isFinite(subtotalNum) ? Math.max(0, subtotalNum) : 0;

  const volumes = buildVolumesFromLinhas(linhas);

  const cartBody: Record<string, unknown> = {
    service: serviceId,
    from: fromPayload,
    to: toPayload,
    products,
    volumes,
    options: {
      insurance_value: Number(insuranceValue.toFixed(2)),
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: true,
      platform: "AccorsiAutoPeças",
      reminder: `Pedido ${pedidoId.slice(0, 8)}`,
      tags: [{ tag: pedidoId }],
    },
  };

  let melhorEnvioId = String(pedido.melhor_envio_id ?? "").trim();

  if (!melhorEnvioId) {
    const cart = await addShipmentToMelhorEnvioCart(cartBody, token);
    if (!cart.ok) {
      return { ok: false, message: `Carrinho Melhor Envio: ${cart.message}` };
    }
    melhorEnvioId = cart.orderId;

    const { error: upErr } = await admin
      .from("pedidos")
      .update({
        melhor_envio_id: melhorEnvioId,
        transportadora_nome: opcao.nome,
        frete_provedor: "melhor_envio",
      })
      .eq("id", pedidoId);

    if (upErr) {
      return {
        ok: false,
        message: `Envio criado no Melhor Envio (${melhorEnvioId}), mas falhou ao salvar no pedido: ${upErr.message}`,
      };
    }
  }

  const compra = await purchaseShipment(melhorEnvioId, { token });
  if (!compra.ok) {
    return {
      ok: false,
      message: `Compra do envio: ${compra.message} (id ${melhorEnvioId}). Verifique saldo na Melhor Carteira.`,
    };
  }

  const etiqueta = await generateShipmentLabel(melhorEnvioId, { token });
  if (!etiqueta.ok) {
    return {
      ok: false,
      message: `Etiqueta: ${etiqueta.message} (id ${melhorEnvioId}). Tente "Gerar etiqueta" manualmente.`,
    };
  }

  const { error: finalErr } = await admin
    .from("pedidos")
    .update({
      melhor_envio_id: melhorEnvioId,
      melhor_envio_etiqueta_url: etiqueta.etiquetaUrl ?? null,
      rastreio_codigo: etiqueta.rastreioCodigo ?? compra.rastreioCodigo ?? null,
      rastreio_url: etiqueta.rastreioUrl ?? compra.rastreioUrl ?? null,
      transportadora_nome: opcao.nome,
      frete_provedor: "melhor_envio",
      logistica_status: "em_separacao",
    })
    .eq("id", pedidoId);

  if (finalErr) {
    return {
      ok: false,
      message: `Etiqueta gerada, mas falhou ao atualizar o pedido: ${finalErr.message}`,
    };
  }

  return {
    ok: true,
    melhorEnvioId,
    etiquetaUrl: etiqueta.etiquetaUrl,
    message: "Etiqueta gerada. Envio comprado no Melhor Envio e dados salvos no pedido.",
  };
}
