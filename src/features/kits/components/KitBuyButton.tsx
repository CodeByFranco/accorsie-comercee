"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/features/carrinho/CartContext";
import { computeKitPricing } from "@/features/kits/utils/kitPricing";
import { kitPricingLines } from "@/features/kits/utils/mapKitRow";
import type { KitChoiceSelection, KitDetail, KitProductInfo } from "@/types/kit";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Preço, escolhas do cliente (ex.: viscosidade e litros) e botão de compra do kit. */
export function KitBuyButton({ kit }: { kit: KitDetail }) {
  const { addKit } = useCart();

  const [selecao, setSelecao] = useState<Map<string, { product_id: string; quantidade: number }>>(
    () =>
      new Map(
        kit.escolhas.map((ch) => {
          const disponivel = ch.opcoes.find((o) => o.quantidade_estoque >= ch.qtd_padrao) ?? ch.opcoes[0];
          return [ch.kit_item_id, { product_id: disponivel?.product_id ?? "", quantidade: ch.qtd_padrao }];
        }),
      ),
  );

  function patch(kitItemId: string, fields: Partial<{ product_id: string; quantidade: number }>) {
    setSelecao((prev) => {
      const next = new Map(prev);
      const cur = next.get(kitItemId) ?? { product_id: "", quantidade: 1 };
      next.set(kitItemId, { ...cur, ...fields });
      return next;
    });
  }

  const pricing = useMemo(
    () =>
      computeKitPricing({
        tipo_desconto: kit.tipo_desconto,
        valor_desconto: kit.valor_desconto,
        preco_final: kit.preco_final,
        items: kitPricingLines(kit.items, kit.escolhas, selecao),
      }),
    [kit, selecao],
  );

  const linhas = useMemo(() => {
    const out: Array<KitProductInfo & { quantity: number }> = kit.items.map((it) => ({
      ...it,
      quantity: it.quantidade,
    }));
    for (const ch of kit.escolhas) {
      const sel = selecao.get(ch.kit_item_id);
      const opt = ch.opcoes.find((o) => o.product_id === sel?.product_id);
      if (!opt || !sel) continue;
      const existing = out.find((l) => l.product_id === opt.product_id);
      if (existing) existing.quantity += sel.quantidade;
      else out.push({ ...opt, quantity: sel.quantidade });
    }
    return out;
  }, [kit, selecao]);

  const escolhasCompletas = kit.escolhas.every((ch) => {
    const sel = selecao.get(ch.kit_item_id);
    return !!sel && ch.opcoes.some((o) => o.product_id === sel.product_id);
  });
  const semEstoque = linhas.some((l) => l.quantidade_estoque < l.quantity);
  const disabled = !escolhasCompletas || semEstoque;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        {pricing.economia > 0 ? (
          <p className="text-base text-store-navy/50 line-through tabular-nums">{money.format(pricing.precoNormal)}</p>
        ) : null}
        <p className="text-3xl font-bold tabular-nums">{money.format(pricing.precoKit)}</p>
        {pricing.economia > 0 ? (
          <p className="!mt-2 inline-block rounded-full border-2 border-store-accent bg-store-accent/10 px-3 py-1.5 text-sm font-bold text-emerald-800">
            Você economiza {money.format(pricing.economia)}</p>
        ) : null}
      </div>

      {kit.escolhas.map((ch) => {
        const sel = selecao.get(ch.kit_item_id);
        const opt = ch.opcoes.find((o) => o.product_id === sel?.product_id);
        return (
          <div key={ch.kit_item_id} className="space-y-3 rounded-sm border border-store-navy/15 bg-white p-4">
            <p className="font-bold">Escolha: {ch.nome}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ch.opcoes.map((o) => {
                const ativo = o.product_id === sel?.product_id;
                const esgotado = o.quantidade_estoque < (sel?.quantidade ?? ch.qtd_min);
                return (
                  <button
                    key={o.product_id}
                    type="button"
                    disabled={o.quantidade_estoque < ch.qtd_min}
                    onClick={() => patch(ch.kit_item_id, { product_id: o.product_id })}
                    className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      ativo
                        ? "border-store-navy bg-store-cream font-semibold"
                        : "border-store-navy/15 hover:border-store-navy/40"
                    }`}
                    aria-pressed={ativo}
                  >
                    {o.imageUrl ? (
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-store-cream">
                        <Image src={o.imageUrl} alt="" fill className="object-cover" sizes="36px" />
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block leading-snug">{o.titulo}</span>
                      <span className="block text-xs font-normal text-store-navy/60">
                        {money.format(o.valor)} / un.{esgotado && ativo ? " · estoque insuficiente" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {ch.qtd_max > ch.qtd_min ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-store-navy/80">Quantidade</span>
                <div className="inline-flex items-center rounded-sm border border-store-navy/20">
                  <button
                    type="button"
                    aria-label="Diminuir"
                    disabled={(sel?.quantidade ?? ch.qtd_min) <= ch.qtd_min}
                    onClick={() => patch(ch.kit_item_id, { quantidade: (sel?.quantidade ?? ch.qtd_min) - 1 })}
                    className="px-3 py-1.5 text-lg leading-none disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center font-semibold tabular-nums">{sel?.quantidade ?? ch.qtd_padrao}</span>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    disabled={(sel?.quantidade ?? ch.qtd_max) >= ch.qtd_max}
                    onClick={() => patch(ch.kit_item_id, { quantidade: (sel?.quantidade ?? ch.qtd_min) + 1 })}
                    className="px-3 py-1.5 text-lg leading-none disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-store-navy/60">
                  de {ch.qtd_min} a {ch.qtd_max}
                </span>
              </div>
            ) : (
              <p className="text-sm text-store-navy/70">Quantidade: {ch.qtd_min}</p>
            )}
            {opt && sel ? (
              <p className="text-xs text-store-navy/60">
                {sel.quantidade}x {opt.titulo} = {money.format(opt.valor * sel.quantidade)}
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const escolhas: KitChoiceSelection[] = kit.escolhas.flatMap((ch) => {
            const sel = selecao.get(ch.kit_item_id);
            return sel ? [{ kit_item_id: ch.kit_item_id, product_id: sel.product_id, quantidade: sel.quantidade }] : [];
          });
          addKit(
            {
              kitId: kit.id,
              nome: kit.nome,
              items: Object.fromEntries(linhas.map((l) => [l.product_id, l.quantity])),
              economia: pricing.economia,
              ...(escolhas.length > 0 ? { escolhas } : {}),
            },
            linhas.map((l) => ({
              id: l.product_id,
              titulo: l.titulo,
              cod_produto: l.cod_produto,
              valor: l.valor,
              imageUrl: l.imageUrl,
              quantidade_estoque: l.quantidade_estoque,
              desconto_pix_percent: l.desconto_pix_percent,
              desconto_cartao_percent: l.desconto_cartao_percent,
              somente_retirada_loja: l.somente_retirada_loja,
              quantity: l.quantity,
            })),
          );
        }}
        className="inline-flex w-full items-center justify-center rounded-sm bg-store-accent px-5 py-3.5 text-sm font-bold text-black shadow-sm transition enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {semEstoque ? "Indisponível" : !escolhasCompletas ? "Escolha as opções" : "Comprar Kit"}
      </button>
    </div>
  );
}
