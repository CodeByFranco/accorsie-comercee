/** Tipos e textos do cashback, sem dependências de servidor (usado também no navegador). */
export type CashbackModo = "livre" | "sempre" | "teto" | "a_cada_n";

export type CashbackConfig = {
  percentual: number;
  modo: CashbackModo;
  tetoValor: number;
  aCadaN: number;
};

export const CASHBACK_PADRAO: CashbackConfig = { percentual: 2.5, modo: "livre", tetoValor: 50, aCadaN: 3 };

export function formatPercentual(p: number): string {
  return p.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Texto curto da regra, para o cliente. */
export function descreverRegraCashback(c: CashbackConfig): string | null {
  const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  switch (c.modo) {
    case "sempre":
      return "O saldo de cashback é descontado automaticamente na sua próxima compra.";
    case "teto":
      return `Ao atingir ${money(c.tetoValor)} de saldo, o cashback é descontado automaticamente na próxima compra.`;
    case "a_cada_n":
      return c.aCadaN <= 1
        ? "O saldo de cashback é descontado automaticamente na sua próxima compra."
        : `O cashback deve ser usado a cada ${c.aCadaN} compras; na ${c.aCadaN}ª compra sem uso ele é descontado automaticamente.`;
    default:
      return null;
  }
}
