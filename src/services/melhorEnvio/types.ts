/**
 * Tipos de cotação / envio Melhor Envio.
 * Placeholders até integrar com produtos/embalagens e doc oficial da API.
 */

export type MelhorEnvioDimensions = {
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  pesoKg: number;
};

/** Uma linha do carrinho para cotação (dimensões efetivas de envio + quantidade). */
export type MelhorEnvioQuoteLine = {
  produtoId: string;
  quantidade: number;
  dimensoes: MelhorEnvioDimensions;
  /** Valor declarado total da linha (centavos), p.ex. preço × quantidade. */
  valorDeclaradoCentavos?: number;
};

export type MelhorEnvioQuoteInput = {
  cepOrigem: string;
  cepDestino: string;
  /** Uma entrada por SKU; cada uma vira um item em `products` na API Melhor Envio. */
  linhas: MelhorEnvioQuoteLine[];
};

export type MelhorEnvioQuoteOption = {
  id: string;
  nome: string;
  precoCentavos: number;
  prazoDiasUteis?: number;
  /** Só na tele rápida: horário limite do dia ("HH:MM"). */
  horarioLimite?: string;
};

export type MelhorEnvioCreateOrderInput = {
  /** ID retornado na cotação (quando existir integração real) */
  cotacaoId: string;
  /** Referência interna, ex.: UUID do pedido */
  referenciaExterna?: string;
};

export type MelhorEnvioOrderResult = {
  melhorEnvioId?: string;
  etiquetaUrl?: string;
};

export type MelhorEnvioQuoteResult =
  | { ok: true; opcoes: MelhorEnvioQuoteOption[] }
  | MelhorEnvioErrorResult;

export type MelhorEnvioCreateOrderResult =
  | { ok: true; dados: MelhorEnvioOrderResult }
  | MelhorEnvioErrorResult;

export type MelhorEnvioShipmentActionResult =
  | {
      ok: true;
      melhorEnvioId: string;
      etiquetaUrl?: string;
      declaracaoConteudoUrl?: string;
      rastreioCodigo?: string;
      rastreioUrl?: string;
    }
  | MelhorEnvioErrorResult;

export type MelhorEnvioErrorResult = {
  ok: false;
  code:
    | "integration_disabled"
    | "not_implemented"
    | "invalid_input"
    | "network_error"
    | "api_error"
    | "invalid_response";
  message: string;
};

/** Resposta de POST /api/v2/me/cart (criar envio no carrinho). */
export type MelhorEnvioCartAddResult =
  | { ok: true; orderId: string; protocol?: string }
  | { ok: false; code: "invalid_input" | "network_error" | "api_error" | "invalid_response"; message: string };
