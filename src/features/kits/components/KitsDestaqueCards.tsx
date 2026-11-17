import Link from "next/link";
import { COMBO_OLEO_FILTROS_HREF, COMBO_OLEO_FILTROS_NOME } from "@/features/kits/utils/comboOleo";

export type KitsDestaqueDescontos = { kit_pix: number; kit_cartao: number; combo_pix: number; combo_cartao: number };

const fmt = (n: number) => `${n.toLocaleString("pt-BR")}%`;

const cardClass =
  "group relative flex h-full flex-col overflow-hidden rounded-sm bg-store-navy px-5 py-4 text-white shadow-sm transition hover:brightness-110 md:px-6 md:py-4";
const badgeClass =
  "inline-block w-fit self-start rounded-full bg-store-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-black";
const ctaClass =
  "mt-3 inline-flex w-fit items-center gap-2 rounded-full border-2 border-store-accent px-5 py-2 text-sm font-bold text-store-accent transition group-hover:bg-store-accent group-hover:text-black";

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
    <div className={`grid gap-1.5 ${suspensaoHref ? "md:grid-cols-2" : ""}`}>
      <Link href={COMBO_OLEO_FILTROS_HREF} className={cardClass}>
        <span className={badgeClass}>Descontos imperdíveis</span>
        <h2 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">{COMBO_OLEO_FILTROS_NOME}</h2>
        <p className="mt-1 text-sm text-white/85">
          Descontos imperdíveis em nossos combos! Kits de filtros e óleo com até {fmt(descontos.combo_pix)} OFF no
          PIX.
        </p>
        <span className={ctaClass}>Ver kits para o meu carro →</span>
      </Link>

      {suspensaoHref ? (
        <Link href={suspensaoHref} className={cardClass}>
          <span className={badgeClass}>Descontos imperdíveis</span>
          <h2 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">Kits de Suspensão</h2>
          <p className="mt-1 text-sm text-white/85">Descontos imperdíveis em nossos combos!</p>
          <span className={ctaClass}>Ver kits de suspensão →</span>
        </Link>
      ) : null}
    </div>
  );
}
