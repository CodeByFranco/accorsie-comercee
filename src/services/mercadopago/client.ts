/**
 * Cliente HTTP do Mercado Pago (Checkout Pro + API de pagamentos).
 *
 * Checklist operacional:
 * - Criar app em https://www.mercadopago.com.br/developers/panel/app
 * - Definir URLs de retorno coerentes com `NEXT_PUBLIC_APP_URL`
 * - Webhook apontando para a mesma origem pública (`/api/webhooks/mercadopago`)
 * - Validar `x-signature` com `MERCADOPAGO_WEBHOOK_SECRET` em produção
 * - Credenciais de teste (`TEST-...`) vs produção conforme ambiente
 */

export const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

const CHECKOUT_PREFERENCES_PATH = "/checkout/preferences";
const PAYMENTS_V1_PATH = "/v1/payments";

const DEFAULT_TIMEOUT_MS = 25_000;

export type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  error?: string;
  cause?: unknown;
};

export type MercadoPagoPaymentResource = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string | null;
  date_last_updated?: string | null;
};

export type MercadoPagoClientConfig = {
  accessToken: string;
  /** Timeout em ms para cada requisição (padrão 25s). */
  timeoutMs?: number;
};

function parseErrorDetail(json: unknown, fallback: string): string {
  if (typeof json !== "object" || json === null) return fallback;
  const o = json as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  if (typeof o.error === "string" && o.error.trim()) return o.error;
  return fallback;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

/**
 * Cria uma Preference de Checkout Pro (`POST /checkout/preferences`).
 */
export async function createPreference(
  body: object,
  config: MercadoPagoClientConfig & { idempotencyKey?: string },
): Promise<
  | { ok: true; data: MercadoPagoPreferenceResponse }
  | { ok: false; status: number; detail: string; data?: MercadoPagoPreferenceResponse }
> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${MERCADOPAGO_API_BASE}${CHECKOUT_PREFERENCES_PATH}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
  };
  if (config.idempotencyKey?.trim()) {
    headers["X-Idempotency-Key"] = config.idempotencyKey.trim();
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
  } catch (e) {
    const detail = isAbortError(e)
      ? "Tempo esgotado ao contatar o Mercado Pago."
      : "Falha de rede ao contatar o Mercado Pago.";
    return { ok: false, status: 0, detail };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      status: res.status,
      detail: res.statusText || "Resposta inválida do Mercado Pago.",
    };
  }

  const data = json as MercadoPagoPreferenceResponse;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      detail: parseErrorDetail(json, res.statusText),
      data,
    };
  }

  return { ok: true, data };
}

/**
 * Busca um pagamento por ID (`GET /v1/payments/:id`).
 */
export async function getPayment(
  paymentId: string,
  config: MercadoPagoClientConfig,
): Promise<
  | { ok: true; payment: MercadoPagoPaymentResource }
  | { ok: false; status: number; detail: string }
> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const id = encodeURIComponent(paymentId.trim());
  const url = `${MERCADOPAGO_API_BASE}${PAYMENTS_V1_PATH}/${id}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
        cache: "no-store",
      },
      timeoutMs,
    );
  } catch (e) {
    const detail = isAbortError(e)
      ? "Tempo esgotado ao consultar pagamento no Mercado Pago."
      : "Falha de rede ao consultar pagamento no Mercado Pago.";
    return { ok: false, status: 0, detail };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      status: res.status,
      detail: res.statusText || "Resposta inválida do Mercado Pago.",
    };
  }

  const payment = json as MercadoPagoPaymentResource & { message?: string; error?: string };
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      detail: parseErrorDetail(json, res.statusText),
    };
  }

  return { ok: true, payment };
}

type PaymentsSearchResponse = {
  results?: MercadoPagoPaymentResource[];
  paging?: { total?: number };
};

/**
 * Lista pagamentos por `external_reference` (ex.: UUID do pedido na preferência).
 * `GET /v1/payments/search`
 */
export async function searchPaymentsByExternalReference(
  externalReference: string,
  config: MercadoPagoClientConfig,
): Promise<
  | { ok: true; results: MercadoPagoPaymentResource[] }
  | { ok: false; status: number; detail: string }
> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const qs = new URLSearchParams({
    sort: "date_created",
    criteria: "desc",
    external_reference: externalReference.trim(),
    limit: "30",
  });
  const url = `${MERCADOPAGO_API_BASE}${PAYMENTS_V1_PATH}/search?${qs.toString()}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
        cache: "no-store",
      },
      timeoutMs,
    );
  } catch (e) {
    const detail = isAbortError(e)
      ? "Tempo esgotado ao buscar pagamentos no Mercado Pago."
      : "Falha de rede ao buscar pagamentos no Mercado Pago.";
    return { ok: false, status: 0, detail };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      status: res.status,
      detail: res.statusText || "Resposta inválida do Mercado Pago.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      detail: parseErrorDetail(json, res.statusText),
    };
  }

  const body = json as PaymentsSearchResponse;
  const results = Array.isArray(body.results) ? body.results : [];
  return { ok: true, results };
}

export function isTestAccessToken(token: string): boolean {
  return token.startsWith("TEST-");
}

export function pickInitPoint(
  body: MercadoPagoPreferenceResponse,
  accessToken: string,
): string {
  const point = isTestAccessToken(accessToken)
    ? (body.sandbox_init_point ?? body.init_point)
    : (body.init_point ?? body.sandbox_init_point);
  if (!point) {
    throw new Error("Resposta do Mercado Pago sem init_point.");
  }
  return point;
}

/**
 * Estorna o pagamento (`POST /v1/payments/:id/refunds`); sem `amount` estorna o total, com `amount` é parcial.
 */
export async function refundPayment(
  paymentId: string,
  config: MercadoPagoClientConfig & { idempotencyKey?: string; amount?: number },
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const id = encodeURIComponent(paymentId.trim());
  const url = `${MERCADOPAGO_API_BASE}${PAYMENTS_V1_PATH}/${id}/refunds`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
  };
  if (config.idempotencyKey?.trim()) {
    headers["X-Idempotency-Key"] = config.idempotencyKey.trim();
  }

  let res: Response;
  try {
    const body =
      config.amount !== undefined && Number.isFinite(config.amount)
        ? JSON.stringify({ amount: Math.round(config.amount * 100) / 100 })
        : "{}";
    res = await fetchWithTimeout(url, { method: "POST", headers, body }, timeoutMs);
  } catch (e) {
    const detail = isAbortError(e)
      ? "Tempo esgotado ao solicitar reembolso no Mercado Pago."
      : "Falha de rede ao solicitar reembolso no Mercado Pago.";
    return { ok: false, status: 0, detail };
  }

  if (res.ok) return { ok: true };

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* corpo vazio */
  }
  return { ok: false, status: res.status, detail: parseErrorDetail(json, res.statusText) };
}
