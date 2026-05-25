import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckoutEntregaValidation = {
  hasSomenteRetirada: boolean;
  error: string | null;
};

export function validateCheckoutEntregaPayload(
  retirada: boolean,
  frete: number,
  hasSomenteRetirada: boolean,
): string | null {
  if (!hasSomenteRetirada) return null;
  if (!retirada) {
    return "Este pedido contém produtos disponíveis apenas para retirada na loja.";
  }
  if (!Number.isFinite(frete) || frete !== 0) {
    return "Produtos somente para retirada na loja não incluem frete.";
  }
  return null;
}

export async function fetchCheckoutSomenteRetiradaFlags(
  supabase: SupabaseClient,
  produtoIds: string[],
): Promise<CheckoutEntregaValidation> {
  const ids = [...new Set(produtoIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { hasSomenteRetirada: false, error: null };
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("id, somente_retirada_loja")
    .in("id", ids);

  if (error) {
    return {
      hasSomenteRetirada: false,
      error: "Não foi possível validar as opções de entrega dos produtos. Tente novamente.",
    };
  }

  const rows = data ?? [];
  if (rows.length !== ids.length) {
    return { hasSomenteRetirada: false, error: "Um ou mais produtos não estão mais disponíveis." };
  }

  const hasSomenteRetirada = rows.some((r) => r.somente_retirada_loja === true);
  return { hasSomenteRetirada, error: null };
}
