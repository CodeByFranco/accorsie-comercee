import Image from "next/image";
import Link from "next/link";
import type { KitSummary } from "@/types/kit";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function KitCard({ kit }: { kit: KitSummary }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-sm border border-store-navy/10 bg-white shadow-sm">
      <Link href={`/kit/${kit.slug}`} className="relative block aspect-square bg-store-cream/40">
        {kit.imagem ? (
          <Image src={kit.imagem} alt="" fill className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-store-navy/40">Sem imagem</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-bold text-store-navy">
          <Link href={`/kit/${kit.slug}`} className="hover:underline">
            {kit.nome}
          </Link>
        </h3>
        <div className="mt-auto space-y-1">
          {kit.economia > 0 ? (
            <p className="text-sm text-store-navy/55 line-through tabular-nums">{money.format(kit.precoNormal)}</p>
          ) : null}
          <p className="text-lg font-bold tabular-nums text-store-navy">
            {kit.temEscolha ? <span className="text-xs font-semibold text-store-navy/60">A partir de </span> : null}
            {money.format(kit.precoKit)}
          </p>
          {kit.economia > 0 ? (
            <p className="text-xs font-semibold text-emerald-800">
              {kit.temEscolha ? "Economize a partir de " : "Economia de "}
              {money.format(kit.economia)}
            </p>
          ) : null}
        </div>
        <Link
          href={`/kit/${kit.slug}`}
          className="mt-2 inline-flex items-center justify-center rounded-sm bg-store-accent px-3 py-2.5 text-center text-sm font-bold text-black transition hover:brightness-95"
        >
          Ver Kit
        </Link>
      </div>
    </article>
  );
}
