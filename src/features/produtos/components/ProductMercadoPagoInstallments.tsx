import { getParcelamentoFaixas } from "@/features/financeiro/services/getParcelamentoFaixas";
import { maxParcelasSemJuros, valorParcelaIgual } from "@/features/produtos/utils/parcelamento";
import { getMercadoPagoInstallments } from "@/services/mercadopago/installments";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Parcelamento no cartão limitado às faixas sem juros do admin. */
export async function ProductMercadoPagoInstallments({ amountBrl }: { amountBrl: number }) {
  if (amountBrl <= 0) return null;

  const faixas = await getParcelamentoFaixas();
  const limiteSemJuros = maxParcelasSemJuros(amountBrl, faixas);

  if (limiteSemJuros < 2) {
    return (
      <section
        className="space-y-2 rounded-md border border-store-accent/25 bg-store-accent/10 px-4 py-3.5"
        aria-labelledby="parcelamento-cartao-titulo"
      >
        <p id="parcelamento-cartao-titulo" className="text-sm font-semibold text-store-navy">
          Parcelamento no cartão
        </p>
        <p className="text-sm text-store-navy">
          <span className="font-semibold text-black">{money.format(amountBrl)}</span> à vista no cartão.
        </p>
      </section>
    );
  }

  const costs = (await getMercadoPagoInstallments(amountBrl))?.filter((c) => c.installments <= limiteSemJuros);
  const semJurosApi = costs
    ?.filter((c) => c.installment_rate === 0 && c.installments > 1 && c.installments <= limiteSemJuros)
    .at(-1);
  const parcelas = semJurosApi?.installments ?? limiteSemJuros;
  const valorParcela = semJurosApi?.installment_amount ?? valorParcelaIgual(amountBrl, parcelas);

  return (
    <section
      className="space-y-2 rounded-md border border-store-accent/25 bg-store-accent/10 px-4 py-3.5"
      aria-labelledby="parcelamento-cartao-titulo"
    >
      <p id="parcelamento-cartao-titulo" className="text-sm font-semibold text-store-navy">
        Parcelamento no cartão
      </p>
      <p className="text-base leading-snug text-store-navy">
        <span className="font-semibold text-black">{money.format(amountBrl)}</span> no cartão em até{" "}
        <span className="font-semibold text-emerald-700">
          {parcelas}x de {money.format(valorParcela)} sem juros
        </span>
      </p>
      <p className="text-xs text-store-navy-muted">Condições finais no checkout do Mercado Pago.</p>
    </section>
  );
}
