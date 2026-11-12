import type { KitDescontoPadrao } from "@/types/kit";

const pct = (n: number) => n.toLocaleString("pt-BR");

/** Banner da vitrine de kits de filtro: oferta enxuta, com o combo em evidência. */
export function ComboOleoBanner({ descontos }: { descontos: KitDescontoPadrao }) {
  return (
    <section
      className="overflow-hidden rounded-sm bg-store-navy text-white"
      aria-labelledby="combo-oleo-heading"
    >
      <div className="px-5 py-4 md:px-6 md:py-5">
        <h1
          id="combo-oleo-heading"
          className="text-xl font-bold uppercase leading-tight tracking-tight md:text-[1.65rem]"
        >
          Troca de óleo completa, com mais economia!
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-snug text-white/85">
          Encontre os filtros ideais para seu veículo e monte seu kit com o óleo e a quantidade que precisa.
        </p>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-sm border border-white/20 bg-white/5 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Kit de filtros</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-black tabular-nums leading-none">{pct(descontos.kit_pix)}%</span>
              <span className="text-sm font-bold uppercase text-store-accent">off</span>
            </p>
            <p className="mt-1 text-xs text-white/80">no PIX ou {pct(descontos.kit_cartao)}% no cartão.</p>
          </div>

          <div className="rounded-sm bg-store-accent px-4 py-3 text-black">
            <p className="text-[11px] font-bold uppercase tracking-wide">Kit + óleo</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-4xl font-black tabular-nums leading-none">{pct(descontos.combo_pix)}%</span>
              <span className="text-sm font-bold uppercase">off</span>
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug">
              no PIX ou {pct(descontos.combo_cartao)}% no cartão, em até 3x sem juros.
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm font-semibold">
          Selecione seu veículo, escolha o kit e personalize sua compra!
        </p>
      </div>
    </section>
  );
}
