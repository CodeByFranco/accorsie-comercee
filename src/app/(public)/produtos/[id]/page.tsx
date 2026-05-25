import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import { ProductMercadoPagoInstallments } from "@/features/produtos/components/ProductMercadoPagoInstallments";
import { ProductDetailAddToCart } from "@/features/produtos/components/ProductDetailAddToCart";
import { ProductPhotoCarousel } from "@/features/produtos/components/ProductPhotoCarousel";
import { ProductsGrid } from "@/features/produtos/components/ProductsGrid";
import { ProductDescriptionDisplay } from "@/features/produtos/components/ProductDescriptionDisplay";
import { ProductFreteCepConsult } from "@/features/produtos/components/ProductFreteCepConsult";
import { getProductDetailPageData } from "@/features/produtos/services/getProductDetailPageData";
import { unitPriceAfterPaymentDiscount } from "@/features/produtos/utils/paymentDiscount";

type PageProps = { params: Promise<{ id: string }> };

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { produto } = await getProductDetailPageData(id);
  return { title: produto ? `${produto.titulo} | Produto` : "Produto não encontrado" };
}

export default async function ProdutoDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const { produto, relacionados } = await getProductDetailPageData(id);

  if (!produto) notFound();

  const outOfStock = produto.quantidade_estoque <= 0;
  const stockText = outOfStock ? "Indisponível no momento" : "Em estoque";

  const precoCartao = unitPriceAfterPaymentDiscount(
    produto.valor,
    "cartao",
    produto.desconto_pix_percent,
    produto.desconto_cartao_percent,
  );
  const precoPix = unitPriceAfterPaymentDiscount(
    produto.valor,
    "pix",
    produto.desconto_pix_percent,
    produto.desconto_cartao_percent,
  );
  const pixDestaque = produto.desconto_pix_percent > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      <main className={`flex-1 py-8 sm:py-10 ${storeShellInset}`}>
        <div className={`${storeShellContent} space-y-10`}>
          <section className="grid grid-cols-1 gap-6 border-b border-store-line pb-8 lg:grid-cols-12 lg:items-stretch lg:gap-8">
            {/* Mobile: foto → compat → compra (incl. descrição logo após o carrinho). Desktop: esq. foto+compat; dir. coluna única com descrição colada ao botão. */}
            <div className="flex w-full justify-center lg:col-span-5 lg:row-start-1 lg:h-full lg:min-h-0 lg:flex-col lg:items-stretch lg:justify-start">
              <div className="flex min-h-[12rem] w-full min-w-0 flex-1 items-center justify-center lg:min-h-0 lg:flex-1 lg:items-start lg:justify-start">
                <ProductPhotoCarousel photos={produto.imageUrls} alt={produto.titulo} />
              </div>
            </div>

            <div className="space-y-2 border-t border-store-line pt-4 lg:col-span-5 lg:row-start-2 lg:border-t lg:border-store-line lg:pt-6">
              <h2 className="text-sm font-semibold text-store-navy">Compatibilidade</h2>
              {produto.compatibilidades.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {produto.compatibilidades.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-store-line bg-store-accent/80 px-3 py-1 text-xs font-semibold text-black"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-store-navy-muted">Compatibilidade ainda não informada.</p>
              )}
            </div>

            <div className="space-y-4 border-t border-store-line pt-4 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:border-t-0 lg:pt-0">
              <h1 className="text-2xl font-bold leading-tight text-black sm:text-3xl">{produto.titulo}</h1>

              <div className="space-y-2">
                <div className="flex flex-row flex-wrap items-end gap-x-3 gap-y-1">
                  <p
                    className="shrink-0 text-3xl font-bold leading-none text-[#1d63ed] sm:text-4xl"
                    aria-label={
                      pixDestaque
                        ? `Preço no PIX ${money.format(precoPix)}, desconto de ${produto.desconto_pix_percent}%`
                        : `Preço no PIX ${money.format(precoPix)}`
                    }
                  >
                    {money.format(precoPix)}
                  </p>
                  <p className="mb-0.5 text-sm font-semibold text-orange-500 sm:text-base">
                    {pixDestaque ? `PIX (${produto.desconto_pix_percent}% OFF)` : "PIX"}
                  </p>
                  <p className="mb-0.5 text-sm font-semibold tabular-nums text-black sm:text-base">
                    {money.format(produto.valor)}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${outOfStock ? "text-red-700" : "text-emerald-700"}`}>
                  {stockText}
                </p>
              </div>

              <ProductMercadoPagoInstallments amountBrl={precoCartao} />

              <ProductFreteCepConsult
                productId={produto.id}
                somenteRetiradaLoja={produto.somente_retirada_loja}
              />

              <div className="space-y-3">
                <ProductDetailAddToCart product={produto} />
                <div className="space-y-2 border-t border-store-line pt-3">
                  <h2 className="text-sm font-semibold text-store-navy">Descrição</h2>
                  <ProductDescriptionDisplay descricao={produto.descricao} />
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="produtos-relacionados-heading" className="space-y-5">
            <header>
              <h2
                id="produtos-relacionados-heading"
                className="text-2xl font-bold tracking-tight text-black sm:text-3xl"
              >
                Produtos relacionados
              </h2>
              <div className="mt-2 h-1 w-14 rounded-[1px] bg-store-navy sm:w-16" aria-hidden />
            </header>
            <ProductsGrid
              variant="catalog"
              pixStyle="home"
              produtos={relacionados}
              emptyMessage="Ainda não encontramos produtos relacionados para este item."
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
