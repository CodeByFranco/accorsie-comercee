import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@/types/product";
import { ProductAddCartButton } from "@/features/produtos/components/ProductAddCartButton";
import { unitPriceAfterPaymentDiscount } from "@/features/produtos/utils/paymentDiscount";
import { isSupabaseStorageUrl } from "@/utils/isSupabaseStorageUrl";

export type { ProductSummary };

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type ProductsGridProps = {
  produtos: ProductSummary[];
  emptyMessage: string;
  /** `home`: até 5 colunas no xl; `catalog`: até 4 colunas (layout vitrine + filtros). */
  variant?: "home" | "catalog";
  /** Selo PIX na foto; por padrão segue `variant` (ex.: `catalog` + `pixStyle="home"`). */
  pixStyle?: "home" | "catalog";
};

function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-store-navy-muted">
        Sem foto
      </div>
    );
  }

  if (!isSupabaseStorageUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL absoluta fora do Storage
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain object-center"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
      className="object-contain object-center"
    />
  );
}

export function ProductsGrid({
  produtos,
  emptyMessage,
  variant = "home",
  pixStyle,
}: ProductsGridProps) {
  const pixLook = pixStyle ?? variant;
  if (produtos.length === 0) {
    return (
      <div
        className="rounded-sm border border-store-line/80 bg-white px-6 py-12 text-center text-sm text-store-navy-muted"
        role="status"
      >
        {emptyMessage}
      </div>
    );
  }

  const gridClass =
    variant === "catalog"
      ? "catalog-products-grid grid w-full grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-4"
      : "home-products-grid grid w-full grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  return (
    <div className="w-full">
      <ul className={gridClass}>
        {produtos.map((p) => {
          const precoPixCard = unitPriceAfterPaymentDiscount(
            p.valor,
            "pix",
            p.desconto_pix_percent,
            p.desconto_cartao_percent,
          );
          const pixBadge = p.desconto_pix_percent > 0;
          return (
            <li key={p.id} className="min-w-0">
              <article className="relative z-0 flex h-full flex-col gap-3 bg-white p-4 sm:p-5">
                <Link
                  href={`/produtos/${p.id}`}
                  className="relative mx-auto block aspect-square w-full max-w-[500px]"
                >
                  <ProductImage src={p.imageUrl} alt={p.titulo} />
                  {pixBadge ? (
                    <span
                      className={`pointer-events-none absolute right-1.5 top-1.5 z-10 inline-flex max-w-[min(100%,11rem)] items-center gap-1.5 rounded-full px-2 py-1 backdrop-blur-[1px] sm:right-2 sm:top-2 sm:gap-2 sm:px-2.5 sm:py-1 ${
                        pixLook === "home"
                          ? "max-w-[min(100%,13rem)] border-2 border-[#1d63ed]/55 bg-[#e8f1ff]/95 text-[0.625rem] shadow-md shadow-[#1d63ed]/15 sm:text-xs"
                          : "border border-store-accent/20 bg-white/85 text-[0.625rem] shadow-sm sm:text-xs"
                      }`}
                      aria-label={`PIX ${money.format(precoPixCard)}, desconto de ${p.desconto_pix_percent}%`}
                    >
                      <span className="shrink-0 font-semibold uppercase tracking-wide text-store-accent/90">
                        Pix
                      </span>
                      <span className="text-store-line/70" aria-hidden>
                        ·
                      </span>
                      <span
                        className={`min-w-0 truncate tabular-nums ${
                          pixLook === "home"
                            ? "text-[0.6875rem] font-extrabold leading-none text-[#063d9e] sm:text-sm sm:leading-none"
                            : "font-medium text-store-navy"
                        }`}
                      >
                        {money.format(precoPixCard)}
                      </span>
                    </span>
                  ) : null}
                </Link>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <h3 className="line-clamp-3 text-left text-sm font-bold leading-snug text-black sm:text-[0.9375rem]">
                    <Link href={`/produtos/${p.id}`} className="hover:underline">
                      {p.titulo}
                    </Link>
                  </h3>
                  <p className="text-left text-lg font-bold leading-tight text-black sm:text-xl">
                    {money.format(Number(p.valor))}
                  </p>
                  <p className="text-left text-xs font-medium text-[#1d63ed]">
                    Verifique a compatibilidade antes de comprar
                  </p>
                </div>
                <div className="mt-auto pt-1">
                  <ProductAddCartButton product={p} />
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
