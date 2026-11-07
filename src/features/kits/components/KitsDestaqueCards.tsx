import Link from "next/link";
import { COMBO_OLEO_FILTROS_HREF, COMBO_OLEO_FILTROS_NOME } from "@/features/kits/utils/comboOleo";

export type KitsDestaqueDescontos = { kit_pix: number; kit_cartao: number; combo_pix: number; combo_cartao: number };

const fmt = (n: number) => `${n.toLocaleString("pt-BR")}%`;

/** Cartões de destaque da home: Kits de Suspensão e Kits de Troca de Óleo e Filtros. */
export function KitsDestaqueCards({
  suspensaoHref,
  descontos,
}: {
  /** null quando não há kits de suspensão publicados com categoria. */
  suspensaoHref: string | null;
  descontos: KitsDestaqueDescontos;
}) {
  return (
    <div className={`grid gap-4 ${suspensaoHref ? "md:grid-cols-2" : ""}`}>
      <Link
        href={COMBO_OLEO_FILTROS_HREF}
        className="group relative overflow-hidden rounded-sm bg-store-navy p-6 text-white shadow-sm transition hover:brightness-110 md:p-8"
      >
        <span className="inline-block rounded-full bg-store-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
          Até {fmt(descontos.combo_pix)} off no PIX
        </span>
        <h2 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{COMBO_OLEO_FILTROS_NOME}</h2>
        <p className="mt-2 max-w-md text-sm text-white/80">
          Kit de filtros com {fmt(descontos.kit_pix)} no PIX ou {fmt(descontos.kit_cartao)} no cartão. Levando o óleo
          junto, o combo vai para {fmt(descontos.combo_pix)} no PIX ou {fmt(descontos.combo_cartao)} no cartão, em até
          3x.
        </p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-store-accent px-5 py-2.5 text-sm font-bold text-black shadow-sm transition group-hover:brightness-105 group-hover:shadow-md">
          Ver kits para o meu carro →
        </span>
      </Link>

      {suspensaoHref ? (
        <Link
          href={suspensaoHref}
          className="group relative overflow-hidden rounded-sm border-2 border-store-navy bg-white p-6 text-store-navy shadow-sm transition hover:bg-store-subtle/60 md:p-8"
        >
          <span className="inline-block rounded-full bg-store-navy px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Kit completo com desconto
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-black md:text-3xl">Kits de Suspensão</h2>
          <p className="mt-2 max-w-md text-sm text-store-navy/80">
            Amortecedores, coifas e batentes prontos para o seu carro: dianteira, traseira ou completa.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-store-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition group-hover:brightness-110 group-hover:shadow-md">
            Ver kits de suspensão →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
