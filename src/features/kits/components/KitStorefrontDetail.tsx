import Image from "next/image";
import Link from "next/link";
import { BrindeSelo } from "@/components/store/BrindeSelo";
import { KitBuyButton } from "@/features/kits/components/KitBuyButton";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { storeShellContent, storeShellInset } from "@/config/storeShell";
import type { KitDetail } from "@/types/kit";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function KitStorefrontDetail({ kit, preview = false }: { kit: KitDetail; preview?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-store-cream font-sans text-store-navy">
      {preview ? (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          Prévia do admin{kit.status !== "published" ? " — kit em rascunho, invisível para clientes" : ""}
        </div>
      ) : null}
      <div className={`${storeShellInset} flex-1 py-8 md:py-12`}>
        <div className={`${storeShellContent} grid gap-8 lg:grid-cols-2 lg:gap-12`}>
          <div className="relative aspect-square overflow-hidden rounded-sm bg-white">
            {kit.imagem ? (
              <Image src={kit.imagem} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-store-navy/40">Sem imagem</div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            {kit.categoria ? (
              <Link
                href={`/kits?categoria=${kit.categoria.slug}`}
                className="text-xs font-semibold uppercase tracking-wide text-store-navy/60 hover:underline"
              >
                Kits de {kit.categoria.nome}
              </Link>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{kit.nome}</h1>
            {kit.descricao ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-store-navy/80">{kit.descricao}</p>
            ) : null}

            <KitBuyButton kit={kit} />
            <BrindeSelo />

            <div>
              <h2 className="text-lg font-bold">Itens inclusos</h2>
              {kit.escolhas.length > 0 ? (
                <p className="mt-1 text-sm text-store-navy/70">
                  Além destes, você escolhe: {kit.escolhas.map((ch) => ch.nome).join(", ")}.
                </p>
              ) : null}
              <ul className="mt-3 divide-y divide-store-navy/10 rounded-sm border border-store-navy/10 bg-white">
                {kit.items.map((it) => (
                  <li key={it.product_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-store-cream">
                      {it.imageUrl ? (
                        <Image src={it.imageUrl} alt="" fill className="object-cover" sizes="56px" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/produtos/${it.product_id}`} className="font-semibold hover:underline">
                        {it.quantidade}x {it.titulo}
                      </Link>
                      <p className="text-xs text-store-navy/60">
                        {it.cod_produto} · {money.format(it.valor)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
