import Link from "next/link";

import { KitCard } from "@/features/kits/components/KitCard";
import { COMBO_OLEO_FILTROS_HREF } from "@/features/kits/utils/comboOleo";
import { ProductsGrid } from "@/features/produtos/components/ProductsGrid";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import type { KitDescontoPadrao, KitSummary } from "@/types/kit";
import type { ProductSummary } from "@/types/product";

type CombosExemploHomeSectionProps = {
  kitsFiltro: ProductSummary[];
  kitsSuspensao: KitSummary[];
  descontoPadrao: KitDescontoPadrao;
};

/**
 * Substitui a vitrine genérica de "Destaques": exemplos reais de kit de filtros
 * (com opção de montar combo com óleo) e kits de suspensão.
 */
export function CombosExemploHomeSection({
  kitsFiltro,
  kitsSuspensao,
  descontoPadrao,
}: CombosExemploHomeSectionProps) {
  if (kitsFiltro.length === 0 && kitsSuspensao.length === 0) return null;

  return (
    <section className={`bg-store-cream py-8 sm:py-10 ${storeShellInset}`} aria-labelledby="home-combos-heading">
      <div className={`${storeShellContent} space-y-10`}>
        <header>
          <h2 id="home-combos-heading" className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Veja como funciona o combo
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-store-navy-muted">
            O kit de filtros é a peça base; na página do produto você adiciona o óleo e a quantidade. Já os kits de
            suspensão já vêm montados com amortecedores, batentes e demais itens do conjunto.
          </p>
          <div className="mt-2 h-1 w-14 rounded-[1px] bg-store-navy sm:w-16" aria-hidden />
        </header>

        {kitsFiltro.length > 0 ? (
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-lg font-bold text-store-navy">Kits de filtros — personalize com óleo</h3>
              <Link href={COMBO_OLEO_FILTROS_HREF} className="text-sm font-semibold text-store-navy hover:underline">
                Ver todos →
              </Link>
            </div>
            <ProductsGrid
              variant="home"
              produtos={kitsFiltro}
              emptyMessage="Nenhum kit de filtros no catálogo."
              compact
            />
          </div>
        ) : null}

        {kitsSuspensao.length > 0 ? (
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-lg font-bold text-store-navy">Kits de suspensão — combo pronto</h3>
              <Link href="/kits?categoria=suspensao" className="text-sm font-semibold text-store-navy hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
              {kitsSuspensao.map((kit) => (
                <KitCard key={kit.id} kit={kit} descontoPadrao={descontoPadrao} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}