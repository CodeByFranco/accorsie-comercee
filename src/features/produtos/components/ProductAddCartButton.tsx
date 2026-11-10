"use client";

import Image from "next/image";

import { CART_ICON_SRC } from "@/features/carrinho/constants";
import { useCart } from "@/features/carrinho/CartContext";
import type { ProductSummary } from "@/types/product";

type ProductAddCartButtonProps = {
  product: ProductSummary;
};

export function ProductAddCartButton({ product }: ProductAddCartButtonProps) {
  const { addProduct, lines } = useCart();
  const stock = Math.max(0, Math.floor(Number(product.quantidade_estoque)));
  const inCart = lines.find((l) => l.id === product.id)?.quantity ?? 0;
  const outOfStock = stock <= 0;
  const atCartLimit = !outOfStock && inCart >= stock;
  const lastUnit = stock === 1 && !outOfStock;
  const disabled = outOfStock || atCartLimit;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {lastUnit ? (
        <p className="text-center text-xs font-semibold text-amber-800" role="status">
          Última peça disponível
        </p>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        className="relative inline-flex w-full items-center justify-center gap-0 rounded-full bg-store-accent px-3 py-2.5 text-sm font-bold text-black shadow-sm transition enabled:hover:brightness-95 enabled:active:brightness-90 disabled:cursor-not-allowed disabled:bg-store-line disabled:text-store-navy-muted sm:gap-2"
        aria-label={
          outOfStock
            ? `${product.titulo} indisponível`
            : atCartLimit
              ? `Quantidade máxima de ${product.titulo} já está no carrinho`
              : `Adicionar ${product.titulo} ao carrinho`
        }
        onClick={() => addProduct(product)}
      >
        <Image
          src={CART_ICON_SRC}
          alt=""
          width={32}
          height={32}
          className="h-5 w-5 shrink-0 object-contain sm:absolute sm:left-3 sm:top-1/2 sm:h-4 sm:w-4 sm:-translate-y-1/2"
          unoptimized
        />
        <span className="hidden text-center sm:block sm:px-5">
          {outOfStock ? "Indisponível" : atCartLimit ? "Quantidade máxima no carrinho" : "Adicionar ao carrinho"}
        </span>
      </button>
    </div>
  );
}
