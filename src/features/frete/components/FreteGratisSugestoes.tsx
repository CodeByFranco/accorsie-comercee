"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { faltaParaFreteGratis } from "@/features/frete/freteGratis";
import { getSugestoesFreteGratis } from "@/features/frete/services/getSugestoesFreteGratis";
import { ProductAddCartButton } from "@/features/produtos/components/ProductAddCartButton";
import { StorefrontPhoto } from "@/features/produtos/components/StorefrontPhoto";
import { unitPriceAfterPaymentDiscount } from "@/features/produtos/utils/paymentDiscount";
import type { ProductSummary } from "@/types/product";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Sugestões de produtos para completar o valor do frete grátis. */
export function FreteGratisSugestoes({
  valorProdutos,
  idsNoCarrinho,
}: {
  valorProdutos: number;
  idsNoCarrinho: string[];
}) {
  const falta = faltaParaFreteGratis(valorProdutos);
  const idsKey = idsNoCarrinho.join(",");
  const [sugestoes, setSugestoes] = useState<ProductSummary[]>([]);

  useEffect(() => {
    if (falta <= 0) return;
    let ativo = true;
    void getSugestoesFreteGratis(falta, idsKey ? idsKey.split(",") : []).then((lista) => {
      if (ativo) setSugestoes(lista);
    });
    return () => {
      ativo = false;
    };
  }, [falta, idsKey]);

  if (falta <= 0 || sugestoes.length === 0) return null;

  return (
    <section
      className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="frete-gratis-sugestoes"
    >
      <h2 id="frete-gratis-sugestoes" className="text-lg font-bold text-black">
        Complete seu pedido e ganhe frete grátis
      </h2>
      <p className="mt-1 text-sm text-store-navy-muted">
        Qualquer um destes itens já garante o frete grátis.
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {sugestoes.map((p) => {
          const precoCartao = unitPriceAfterPaymentDiscount(
            p.valor,
            "cartao",
            p.desconto_pix_percent,
            p.desconto_cartao_percent,
          );
          return (
            <li key={p.id} className="flex flex-col gap-2">
              <Link
                href={`/produtos/${p.id}`}
                className="relative block aspect-square overflow-hidden rounded-sm bg-white"
              >
                <StorefrontPhoto src={p.imageUrl} alt={p.titulo} />
              </Link>
              <Link
                href={`/produtos/${p.id}`}
                className="line-clamp-2 min-h-[2lh] text-xs font-bold leading-snug text-black hover:underline"
              >
                {p.titulo}
              </Link>
              <p className="text-sm font-bold tabular-nums text-black">{money.format(precoCartao)}</p>
              <div className="mt-auto">
                <ProductAddCartButton product={p} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
