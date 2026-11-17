import type { KitDescontoPadrao } from "@/types/kit";

const pct = (n: number) => n.toLocaleString("pt-BR");

const boxClass = "rounded-sm border border-white/15 bg-white/10 px-3.5 py-2.5";

type ComboOleoBannerProps = {
  descontos: KitDescontoPadrao;
  /** Aceito pelo catálogo; o banner comercial não usa mais esses valores. */
  valorKitReferencia?: number;
  valorComboReferencia?: number;
};

/** Banner da vitrine de kits de filtro: só o desconto de combo no PIX. */
export function ComboOleoBanner({ descontos }: ComboOleoBannerProps) {
  return (
    <section
      className="overflow-hidden rounded-sm bg-store-navy text-white"
      aria-labelledby="combo-oleo-heading"
    >
      <div className="px-4 py-3.5 sm:px-5 sm:py-4">
        <h1
          id="combo-oleo-heading"
          className="text-lg font-black uppercase leading-tight tracking-tight sm:text-2xl"
        >
          Descontos imperdíveis em nossos combos!
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-snug text-white/90">
          Kits de filtros e óleo com até {pct(descontos.combo_pix)}% OFF no PIX.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className={boxClass}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Combos Accorsi</p>
            <p className="mt-1 text-lg font-black uppercase leading-tight tracking-tight">
              Descontos imperdíveis
            </p>
            <p className="mt-1 text-xs text-white/80">em nossos combos de filtros e óleo.</p>
          </div>

          <div className={boxClass}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Kit + óleo</p>
            <p className="mt-0.5 flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums leading-none tracking-tight">
                {pct(descontos.combo_pix)}%
              </span>
              <span className="mb-1 text-sm font-black uppercase text-store-accent">off</span>
            </p>
            <p className="mt-1 text-xs text-white/80">no PIX.</p>
          </div>
        </div>

        <p className="mt-2.5 text-sm font-semibold leading-snug">
          Selecione seu veículo, escolha o kit e personalize sua compra!
        </p>
      </div>
    </section>
  );
}
