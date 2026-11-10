import { getMercadoPagoInstallments } from "@/services/mercadopago/installments";
import { maxParcelasCheckout } from "@/features/produtos/utils/parcelamento";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Parcelamento no cartão com os valores reais do Mercado Pago. */
export async function ProductMercadoPagoInstallments({ amountBrl }: { amountBrl: number }) {
  if (amountBrl <= 0) return null;

  const limite = maxParcelasCheckout(amountBrl);
  const costs = (await getMercadoPagoInstallments(amountBrl))?.filter(
    (c) => c.installments <= limite,
  );

  const semJuros = costs?.filter((c) => c.installment_rate === 0 && c.installments > 1).at(-1);
  const maior = costs?.at(-1);
  const comJuros = maior && maior.installment_rate > 0 ? maior : null;

  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-store-navy">Parcelamento no cartão</p>
      <p className="text-base text-store-navy">
        <span className="font-semibold text-black">{money.format(amountBrl)}</span> no cartão
        {semJuros ? (
          <>
            {" "}em até{" "}
            <span className="font-semibold text-emerald-700">
              {semJuros.installments}x de {money.format(semJuros.installment_amount)} sem juros
            </span>
          </>
        ) : null}
      </p>
      {comJuros ? (
        <p className="text-sm text-store-navy">
          {semJuros ? "ou em" : "Em"} até {comJuros.installments}x de{" "}
          <span className="font-semibold">{money.format(comJuros.installment_amount)}</span> (total{" "}
          {money.format(comJuros.total_amount)})
        </p>
      ) : null}
      <p className="text-xs text-store-navy-muted">Valores do Mercado Pago (Mastercard). Condições finais no checkout.</p>
    </div>
  );
}
