import type { MelhorEnvioQuoteOption } from "@/services/melhorEnvio/types";

/** ID fixo da opção de tele rápida na lista de fretes (nunca colide com IDs numéricos do Melhor Envio). */
export const TELE_RAPIDA_ID = "tele-rapida";

export function isTeleRapida(opcao: Pick<MelhorEnvioQuoteOption, "id"> | null | undefined): boolean {
  return opcao?.id === TELE_RAPIDA_ID;
}

export function normalizarCidade(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}
