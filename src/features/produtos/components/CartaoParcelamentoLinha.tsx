"use client";

import { useParcelamentoFaixas } from "@/features/financeiro/components/ParcelamentoFaixasProvider";
import { maxParcelasSemJuros, valorParcelaIgual } from "@/features/produtos/utils/parcelamento";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Uma linha de parcelamento (vitrine / kits) conforme as faixas do admin. */
export function CartaoParcelamentoLinha({
  amount,
  className = "mt-0.5 text-xs text-store-navy-muted",
}: {
  amount: number;
  className?: string;
}) {
  const faixas = useParcelamentoFaixas();
  if (amount <= 0) return null;

  const parcelasSemJuros = maxParcelasSemJuros(amount, faixas);
  if (parcelasSemJuros < 2) return null;

  const valorParcela = valorParcelaIgual(amount, parcelasSemJuros);

  return (
    <p className={className}>
      ou <span className="font-semibold tabular-nums text-store-navy">{money.format(amount)}</span> no cartão em até{" "}
      <span className="font-semibold text-emerald-700">
        {parcelasSemJuros}x de {money.format(valorParcela)} sem juros
      </span>
    </p>
  );
}
