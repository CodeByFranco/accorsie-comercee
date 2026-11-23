/** Lembra no navegador se o cliente escolheu "retirar na loja" no carrinho, para o checkout já abrir assim. */
export type ModoEntrega = "envio" | "retirada";

const KEY = "accorsi:modo-entrega";

export function lerModoEntregaPreferido(): ModoEntrega | null {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === "retirada" || v === "envio" ? v : null;
  } catch {
    return null;
  }
}

export function salvarModoEntregaPreferido(modo: ModoEntrega): void {
  try {
    window.sessionStorage.setItem(KEY, modo);
  } catch {
    /* sem storage: segue sem lembrar */
  }
}
