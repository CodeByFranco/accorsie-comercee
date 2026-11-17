import Link from "next/link";
import { StorefrontPhoto } from "@/features/produtos/components/StorefrontPhoto";
import { CartaoParcelamentoLinha } from "@/features/produtos/components/CartaoParcelamentoLinha";
import type { KitDescontoPadrao, KitSummary } from "@/types/kit";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type KitCardProps = {
  kit: KitSummary;
  descontoPadrao?: KitDescontoPadrao | null;
};

export function KitCard({ kit, descontoPadrao }: KitCardProps) {
  const usaPadrao = kit.usa_desconto_padrao && descontoPadrao != null;
  const precoPix = usaPadrao
    ? r2(kit.precoNormal * (1 - descontoPadrao.kit_pix / 100))
    : kit.precoKit;
  const precoCartao = usaPadrao
    ? r2(kit.precoNormal * (1 - descontoPadrao.kit_cartao / 100))
    : kit.precoKit;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-sm border border-store-navy/10 bg-white shadow-sm">
      <Link href={`/kit/${kit.slug}`} className="relative block aspect-square overflow-hidden bg-white">
        <StorefrontPhoto src={kit.imagem} alt="" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-3 text-sm font-bold leading-snug text-store-navy sm:text-[0.9375rem]">
          <Link href={`/kit/${kit.slug}`} className="hover:underline">
            {kit.nome}
          </Link>
        </h3>
        <div className="text-left">
          {usaPadrao ? (
            <>
              <p className="flex items-baseline gap-1.5 leading-tight">
                <span className="text-lg font-bold tabular-nums text-black sm:text-xl">
                  {kit.temEscolha ? (
                    <span className="mr-1 text-xs font-semibold text-store-navy/60">A partir de </span>
                  ) : null}
                  {money.format(precoPix)}
                </span>
                <span className="text-xs font-semibold text-store-accent">no PIX</span>
              </p>
              <CartaoParcelamentoLinha amount={precoCartao} />
            </>
          ) : (
            <>
              {kit.economia > 0 ? (
                <p className="text-sm text-store-navy/55 line-through tabular-nums">{money.format(kit.precoNormal)}</p>
              ) : null}
              <p className="text-lg font-bold tabular-nums text-store-navy sm:text-xl">
                {kit.temEscolha ? <span className="text-xs font-semibold text-store-navy/60">A partir de </span> : null}
                {money.format(kit.precoKit)}
              </p>
              {kit.economia > 0 ? (
                <p className="text-xs font-semibold text-emerald-800">
                  {kit.temEscolha ? "Economize a partir de " : "Economia de "}
                  {money.format(kit.economia)}
                </p>
              ) : null}
              <CartaoParcelamentoLinha amount={precoCartao} />
            </>
          )}
        </div>
        <Link
          href={`/kit/${kit.slug}`}
          className="mt-auto inline-flex items-center justify-center rounded-sm bg-store-accent px-3 py-2.5 text-center text-sm font-bold text-black transition hover:brightness-95"
        >
          Ver Kit
        </Link>
      </div>
    </article>
  );
}