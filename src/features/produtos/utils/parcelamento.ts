/** Acima deste valor o checkout libera mais parcelas. */
export const LIMITE_PARCELAMENTO_ESTENDIDO = 400;

/**
 * Só ligar quando a conta do Mercado Pago estiver com parcelamento sem acréscimo ativo;
 * caso contrário a vitrine prometeria "sem juros" e o checkout cobraria juros.
 */
export const PARCELAMENTO_SEM_JUROS = false;

/** Máximo de parcelas oferecido no checkout para um valor. */
export function maxParcelasCheckout(amountBrl: number): number {
  return amountBrl > LIMITE_PARCELAMENTO_ESTENDIDO ? 10 : 3;
}
