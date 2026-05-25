"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { storeShellContent, storeShellInset } from "@/config/storeShell";
import { CART_ICON_SRC } from "@/features/carrinho/constants";
import { useCart } from "@/features/carrinho/CartContext";
import { useFreteQuote } from "@/features/frete/hooks/useFreteQuote";
import { cartRequiresSomenteRetirada } from "@/features/produtos/utils/mapProductSummaryRow";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V5a3 3 0 016 0v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type CartPageProps = {
  initialProfileCep?: string;
};

export function CartPage({ initialProfileCep = "" }: CartPageProps) {
  const { lines, itemCount, subtotal, increment, decrement, removeProduct } = useCart();
  const hasItems = lines.length > 0;
  const itensPayload = useMemo(
    () => lines.map((l) => ({ produto_id: l.id, quantidade: l.quantity })),
    [lines],
  );
  const exigeRetiradaLoja = useMemo(() => cartRequiresSomenteRetirada(lines), [lines]);
  const profileCep = initialProfileCep.trim();
  const missingProfileCep =
    hasItems && !exigeRetiradaLoja && profileCep.replace(/\D/g, "").length !== 8;
  const frete = useFreteQuote(itensPayload, profileCep, hasItems && !exigeRetiradaLoja);
  const shipping =
    hasItems && !exigeRetiradaLoja && !missingProfileCep ? frete.freteValue : 0;
  const total = subtotal + shipping;
  const canGoCheckout =
    hasItems &&
    (exigeRetiradaLoja || (!missingProfileCep && Boolean(frete.selectedOption)));

  return (
    <div className={`flex flex-1 flex-col py-8 sm:py-10 ${storeShellInset}`}>
      <div className={storeShellContent}>
        <Link
          href="/produtos"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-store-navy underline-offset-4 hover:text-store-accent hover:underline"
        >
          <span aria-hidden>←</span> Continuar comprando
        </Link>

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-black sm:text-3xl">
          Carrinho de Compras
        </h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,20rem)] lg:items-start lg:gap-8">
          <section
            className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="cart-items-heading"
          >
            <h2 id="cart-items-heading" className="mb-5 text-lg font-bold text-black">
              Itens ({itemCount})
            </h2>

            {!hasItems ? (
              <div className="flex flex-col items-center rounded-sm border border-gray-100 bg-gray-50/90 px-6 py-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-store-subtle"
                  aria-hidden
                >
                  <Image
                    src={CART_ICON_SRC}
                    alt=""
                    width={64}
                    height={64}
                    className="h-8 w-8 object-contain"
                    unoptimized
                  />
                </div>
                <p className="text-lg font-bold text-black">Seu carrinho está vazio</p>
                <p className="mt-2 max-w-sm text-sm text-black">
                  Adicione produtos ao carrinho para continuar
                </p>
                <Link
                  href="/produtos"
                  className="mt-8 inline-flex min-w-[11rem] items-center justify-center rounded-full bg-store-accent px-8 py-3 text-sm font-bold text-black shadow-sm transition-[transform,filter,box-shadow] duration-150 hover:brightness-95 active:scale-[0.98]"
                >
                  Ver produtos
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-store-line/60">
                {lines.map((line) => {
                  const stock = Math.max(0, Math.floor(Number(line.quantidade_estoque)));
                  const lastUnit = stock === 1;
                  const atMax = line.quantity >= stock;
                  return (
                  <li key={line.id} className="py-5 first:pt-0">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex shrink-0 gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-store-line/60 bg-store-subtle sm:h-28 sm:w-28">
                          {line.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- URLs externas e Storage
                            <img
                              src={line.imageUrl}
                              alt={line.titulo}
                              className="h-full w-full object-contain object-center p-1"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-store-navy-muted">
                              Sem foto
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 sm:hidden">
                          <p className="text-right text-base font-bold text-black">
                            {money.format(line.valor)}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold leading-snug text-black">{line.titulo}</h3>

                        {lastUnit ? (
                          <p
                            className="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950"
                            role="status"
                          >
                            Última peça disponível.
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-store-navy">Quantidade</span>
                          <div className="inline-flex items-center gap-1 rounded-sm border border-store-line bg-white">
                            <button
                              type="button"
                              className="flex h-9 w-9 items-center justify-center text-lg font-medium text-store-navy transition hover:bg-store-subtle"
                              aria-label="Diminuir quantidade"
                              onClick={() => decrement(line.id)}
                            >
                              −
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={atMax}
                              className="flex h-9 w-9 items-center justify-center text-lg font-medium text-store-navy transition hover:bg-store-subtle disabled:cursor-not-allowed disabled:text-store-navy-muted disabled:hover:bg-transparent"
                              aria-label="Aumentar quantidade"
                              onClick={() => increment(line.id)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="ml-1 flex h-9 w-9 items-center justify-center rounded-sm text-store-navy-muted transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remover ${line.titulo} do carrinho`}
                            onClick={() => removeProduct(line.id)}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <p className="hidden shrink-0 text-right text-base font-bold text-black sm:block sm:min-w-[6.5rem]">
                        {money.format(line.valor)}
                      </p>
                    </div>
                    <div className="mt-4 h-px w-full bg-store-accent" aria-hidden />
                  </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside
            className="rounded-sm border border-store-line/80 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6"
            aria-labelledby="cart-summary-heading"
          >
            <h2 id="cart-summary-heading" className="text-lg font-bold text-black">
              Resumo do pedido
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-store-navy">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-black">{money.format(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-store-navy">Frete</dt>
                <dd className="font-semibold tabular-nums text-black">{money.format(shipping)}</dd>
              </div>
            </dl>
            {hasItems ? (
              <div className="mt-4 rounded-sm border border-store-line/70 bg-store-subtle/30 p-3 text-xs text-store-navy">
                {exigeRetiradaLoja ? (
                  <p>
                    Este pedido inclui produtos <strong>somente para retirada na loja</strong>. O frete não se
                    aplica; no checkout você confirma os dados para retirada.
                  </p>
                ) : missingProfileCep ? (
                  <p>
                    Defina seu CEP no <Link href="/conta" className="font-semibold underline">perfil</Link> para
                    calcular o frete.
                  </p>
                ) : frete.loading ? (
                  <p>Calculando opcoes de frete...</p>
                ) : frete.error ? (
                  <p>{frete.error}</p>
                ) : frete.opcoes.length > 0 ? (
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-semibold">Selecione o frete</legend>
                    {frete.opcoes.map((opcao) => (
                      <label key={opcao.id} className="flex cursor-pointer items-center justify-between gap-2 rounded border border-store-line/70 bg-white px-2 py-1.5">
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="cart-frete"
                            checked={frete.selectedId === opcao.id}
                            onChange={() => frete.setSelectedId(opcao.id)}
                          />
                          <span>
                            {opcao.nome}
                            {typeof opcao.prazoDiasUteis === "number" ? ` (${opcao.prazoDiasUteis} dias uteis)` : ""}
                          </span>
                        </span>
                        <strong>{money.format(opcao.precoCentavos / 100)}</strong>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
              </div>
            ) : null}

            <div className="my-5 h-px bg-store-accent" aria-hidden />

            <div className="flex items-end justify-between gap-4">
              <span className="text-base font-bold text-black">Total</span>
              <span className="text-xl font-bold tabular-nums text-black sm:text-2xl">
                {money.format(total)}
              </span>
            </div>

            {canGoCheckout ? (
              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-sm bg-store-accent py-3.5 text-center text-sm font-bold text-black shadow-sm transition hover:brightness-95"
              >
                Finalizar compra
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-sm bg-store-line py-3.5 text-center text-sm font-bold text-store-navy-muted"
              >
                Finalizar compra
              </button>
            )}
            <p className="mt-3 text-center text-xs text-store-navy-muted">
              Pagamento seguro e criptografado
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
