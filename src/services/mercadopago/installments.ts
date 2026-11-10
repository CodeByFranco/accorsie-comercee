
import { MERCADOPAGO_API_BASE } from "@/services/mercadopago/client";

export type MercadoPagoPayerCost = {
  installments: number;
  /** Juros total (%) cobrado do comprador; 0 = sem juros. */
  installment_rate: number;
  installment_amount: number;
  total_amount: number;
};

/**
 * Parcelas reais da conta no Mercado Pago (mesma tabela usada no checkout).
 * Usa Mastercard como referência; o cache evita uma chamada por visita.
 */
export async function getMercadoPagoInstallments(
  amount: number,
): Promise<MercadoPagoPayerCost[] | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || amount <= 0) return null;

  try {
    const url = `${MERCADOPAGO_API_BASE}/v1/payment_methods/installments?amount=${amount.toFixed(2)}&payment_method_id=master`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { payer_costs?: MercadoPagoPayerCost[] }[];
    const costs = json[0]?.payer_costs;
    return Array.isArray(costs) && costs.length > 0 ? costs : null;
  } catch {
    return null;
  }
}
