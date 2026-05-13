import Link from "next/link";
import { ProductsGrid } from "@/features/produtos/components/ProductsGrid";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import type { ProductSummary } from "@/types/product";

type ProductShowcaseSectionProps = {
  title: string;
  headingId: string;
  produtos: ProductSummary[];
  emptyMessage: string;
  /** Quando definido, exibe CTA ao final da seção (ex.: catálogo completo). */
  seeMoreHref?: string;
  seeMoreLabel?: string;
};

export function ProductShowcaseSection({
  title,
  headingId,
  produtos,
  emptyMessage,
  seeMoreHref,
  seeMoreLabel = "Veja mais",
}: ProductShowcaseSectionProps) {
  return (
    <section
      className={`bg-store-cream py-10 sm:py-12 ${storeShellInset}`}
      aria-labelledby={headingId}
    >
      <div className={storeShellContent}>
        <header className="mb-6 sm:mb-8">
          <h2
            id={headingId}
            className="text-2xl font-bold tracking-tight text-black sm:text-3xl"
          >
            {title}
          </h2>
          <div className="mt-2 h-1 w-14 rounded-[1px] bg-store-navy sm:w-16" aria-hidden />
        </header>
        <ProductsGrid produtos={produtos} emptyMessage={emptyMessage} />
        {seeMoreHref && produtos.length > 0 ? (
          <div className="mt-8 flex justify-center sm:mt-10">
            <Link
              href={seeMoreHref}
              className="inline-flex min-w-[11rem] items-center justify-center rounded-full bg-store-accent px-8 py-3 text-sm font-bold text-black shadow-sm transition-[transform,filter,box-shadow] duration-150 hover:brightness-95 active:scale-[0.98]"
            >
              {seeMoreLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
