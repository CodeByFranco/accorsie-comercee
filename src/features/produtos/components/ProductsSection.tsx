import { ProductShowcaseSection } from "@/features/produtos/components/ProductShowcaseSection";
import type { ProductSummary } from "@/types/product";

const EMPTY_DEFAULT =
  "Nenhum produto cadastrado ainda. Assim que houver itens no catálogo, eles aparecerão aqui.";

type ProductsSectionProps = {
  produtos: ProductSummary[];
  emptyMessage?: string;
};

export function ProductsSection({ produtos, emptyMessage }: ProductsSectionProps) {
  return (
    <ProductShowcaseSection
      title="Produtos"
      headingId="home-produtos-heading"
      produtos={produtos}
      emptyMessage={emptyMessage ?? EMPTY_DEFAULT}
      seeMoreHref="/produtos"
    />
  );
}
