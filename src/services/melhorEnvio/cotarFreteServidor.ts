import {
  ensureMelhorEnvioAccessToken,
  MelhorEnvioCredentialsMissingError,
  quoteShipment,
} from "@/services/melhorEnvio";
import type { MelhorEnvioQuoteLine, MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";
import {
  type EmbalagemRow,
  type ProdutoFreteRow,
  rowToQuoteLine,
} from "@/services/melhorEnvio/freteQuoteLinesFromRows";
import { PRODUCT_STATUS_PUBLISHED } from "@/features/produtos/utils/productStatus";
import type { createClient } from "@/services/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type CotarFreteResult =
  | { ok: true; opcoes: MelhorEnvioQuoteOption[] }
  | { ok: false; status: number; error: string };

export function normalizeCep(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

/**
 * Cotação de frete feita só no servidor (dimensões/peso vêm do banco, nunca do navegador).
 * Usada por POST /api/frete/calcular e para revalidar o frete no fechamento do pedido.
 */
export async function cotarFreteServidor(
  supabase: SupabaseServer,
  cepDestinoRaw: unknown,
  itens: Map<string, number>,
): Promise<CotarFreteResult> {
  const cepOrigemRaw = process.env.MELHOR_ENVIO_CEP_ORIGEM?.trim();
  const cepOrigem = cepOrigemRaw ? normalizeCep(cepOrigemRaw) : null;
  if (!cepOrigem) {
    return {
      ok: false,
      status: 503,
      error: "CEP de origem não configurado. Defina MELHOR_ENVIO_CEP_ORIGEM no servidor.",
    };
  }

  const cepDestino = normalizeCep(cepDestinoRaw);
  if (!cepDestino) {
    return { ok: false, status: 400, error: "Informe `cep_destino` (ou `cep`) com 8 dígitos." };
  }

  const ids = [...itens.keys()];
  if (ids.length === 0) {
    return { ok: false, status: 400, error: "Nenhum item válido para cotação." };
  }

  const { data: prodRows, error: prodErr } = await supabase
    .from("produtos")
    .select(
      "id, valor, quantidade_estoque, prod_comprimento_cm, prod_largura_cm, prod_altura_cm, prod_peso_kg, embalagem_id, somente_retirada_loja",
    )
    .eq("status", PRODUCT_STATUS_PUBLISHED)
    .in("id", ids);

  if (prodErr) {
    return { ok: false, status: 502, error: "Não foi possível carregar os produtos. Tente novamente." };
  }

  const rows = (prodRows ?? []) as (ProdutoFreteRow & { somente_retirada_loja?: boolean | null })[];
  if (rows.length !== ids.length) {
    return { ok: false, status: 400, error: "Um ou mais produtos não foram encontrados." };
  }

  const embIds = [
    ...new Set(rows.map((r) => r.embalagem_id).filter((id): id is string => Boolean(id))),
  ];
  const embalagens = new Map<string, EmbalagemRow>();
  if (embIds.length > 0) {
    const { data: embData, error: embErr } = await supabase
      .from("embalagens")
      .select("id, comprimento_cm, largura_cm, altura_cm, peso_embalagem_kg")
      .in("id", embIds);
    if (embErr) {
      return { ok: false, status: 502, error: "Não foi possível carregar embalagens. Tente novamente." };
    }
    for (const e of (embData ?? []) as EmbalagemRow[]) {
      embalagens.set(e.id, e);
    }
  }

  if (rows.some((r) => r.somente_retirada_loja === true)) {
    return {
      ok: false,
      status: 400,
      error:
        "Um ou mais produtos do carrinho estão disponíveis apenas para retirada na loja. Não é possível calcular frete.",
    };
  }

  const linhas: MelhorEnvioQuoteLine[] = [];
  for (const row of rows) {
    const quantidade = itens.get(row.id);
    if (quantidade === undefined) continue;
    const estoqueRaw = row.quantidade_estoque;
    const estoque =
      typeof estoqueRaw === "number" ? estoqueRaw : Number.parseInt(String(estoqueRaw ?? "0"), 10);
    if (Number.isFinite(estoque) && estoque >= 0 && quantidade > estoque) {
      return { ok: false, status: 400, error: "Estoque insuficiente para um ou mais itens." };
    }
    const built = rowToQuoteLine(row, embalagens, quantidade);
    if (!built.ok) {
      return { ok: false, status: 400, error: built.message };
    }
    linhas.push(built.line);
  }

  if (linhas.length === 0) {
    return { ok: false, status: 400, error: "Nenhum item válido para cotação." };
  }

  let token: string;
  try {
    token = await ensureMelhorEnvioAccessToken();
  } catch (err) {
    if (err instanceof MelhorEnvioCredentialsMissingError) {
      return { ok: false, status: 503, error: "Integração de frete não configurada na loja." };
    }
    console.error("[frete] falha ao obter token Melhor Envio.");
    return {
      ok: false,
      status: 503,
      error: "Não foi possível preparar a cotação de frete. Tente mais tarde.",
    };
  }

  const result = await quoteShipment({ cepOrigem, cepDestino, linhas }, { token });
  if (!result.ok) {
    return { ok: false, status: result.code === "invalid_input" ? 400 : result.code === "integration_disabled" ? 503 : 502, error: result.message };
  }

  return { ok: true, opcoes: result.opcoes };
}
