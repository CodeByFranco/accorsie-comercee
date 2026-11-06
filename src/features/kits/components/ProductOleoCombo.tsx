"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/features/carrinho/CartContext";
import { KIT_COMBO_ITEM_ID, type KitCombo, type KitDescontoPadrao } from "@/types/kit";
import type { ProductSummary } from "@/types/product";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmtPct = (n: number) => `${n.toLocaleString("pt-BR")}%`;

/** "Leve junto: óleo" na página de um produto "Kit filtros": produto + óleo com o % do combo. */
export function ProductOleoCombo({
  produto,
  combo,
  descontoPadrao,
}: {
  produto: ProductSummary;
  combo: KitCombo;
  descontoPadrao: KitDescontoPadrao;
}) {
  const { addKit } = useCart();
  const [sel, setSel] = useState(() => ({
    product_id:
      (combo.opcoes.find((o) => o.quantidade_estoque >= combo.qtd_padrao) ?? combo.opcoes[0])?.product_id ?? "",
    quantidade: combo.qtd_padrao,
  }));
  const oleo = combo.opcoes.find((o) => o.product_id === sel.product_id) ?? null;

  const precos = useMemo(() => {
    const normal = r2(produto.valor + (oleo ? oleo.valor * sel.quantidade : 0));
    return {
      normal,
      pix: r2(normal * (1 - descontoPadrao.combo_pix / 100)),
      cartao: r2(normal * (1 - descontoPadrao.combo_cartao / 100)),
    };
  }, [produto.valor, oleo, sel.quantidade, descontoPadrao]);

  const semEstoque =
    produto.quantidade_estoque < 1 || !oleo || oleo.quantidade_estoque < sel.quantidade;

  function comprar() {
    if (!oleo || semEstoque) return;
    addKit(
      {
        kitId: `produto:${produto.id}`,
        produtoId: produto.id,
        nome: `Combo ${produto.titulo}`,
        items: oleo.product_id === produto.id
          ? { [produto.id]: 1 + sel.quantidade }
          : { [produto.id]: 1, [oleo.product_id]: sel.quantidade },
        economia: r2(precos.normal - precos.pix),
        escolhas: [{ kit_item_id: KIT_COMBO_ITEM_ID, product_id: oleo.product_id, quantidade: sel.quantidade }],
        padrao: { pix: descontoPadrao.combo_pix, cartao: descontoPadrao.combo_cartao },
      },
      [
        {
          id: produto.id,
          titulo: produto.titulo,
          cod_produto: produto.cod_produto,
          valor: produto.valor,
          imageUrl: produto.imageUrl,
          quantidade_estoque: produto.quantidade_estoque,
          desconto_pix_percent: produto.desconto_pix_percent,
          desconto_cartao_percent: produto.desconto_cartao_percent,
          somente_retirada_loja: produto.somente_retirada_loja,
          quantity: 1,
        },
        {
          id: oleo.product_id,
          titulo: oleo.titulo,
          cod_produto: oleo.cod_produto,
          valor: oleo.valor,
          imageUrl: oleo.imageUrl,
          quantidade_estoque: oleo.quantidade_estoque,
          desconto_pix_percent: oleo.desconto_pix_percent,
          desconto_cartao_percent: oleo.desconto_cartao_percent,
          somente_retirada_loja: oleo.somente_retirada_loja,
          quantity: sel.quantidade,
        },
      ],
    );
  }

  return (
    <section className="space-y-4 rounded-sm border-2 border-store-accent bg-store-accent/5 p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Combo troca de óleo e filtros</p>
        <h2 className="text-lg font-bold text-black">Leve junto: {combo.nome}</h2>
        <p className="text-sm text-store-navy/80">
          Comprando o kit com o óleo, o combo inteiro sai com <strong>{fmtPct(descontoPadrao.combo_pix)} off no PIX</strong>{" "}
          ou <strong>{fmtPct(descontoPadrao.combo_cartao)} no cartão</strong>.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {combo.opcoes.map((o) => {
          const ativo = o.product_id === sel.product_id;
          return (
            <button
              key={o.product_id}
              type="button"
              disabled={o.quantidade_estoque < combo.qtd_min}
              onClick={() => setSel((c) => ({ ...c, product_id: o.product_id }))}
              aria-pressed={ativo}
              className={`flex items-center gap-2 rounded-sm border bg-white px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                ativo ? "border-store-navy font-semibold ring-1 ring-store-navy" : "border-store-navy/15 hover:border-store-navy/40"
              }`}
            >
              {o.imageUrl ? (
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-store-cream">
                  <Image src={o.imageUrl} alt="" fill className="object-cover" sizes="36px" />
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block leading-snug">{o.titulo}</span>
                <span className="block text-xs font-normal text-store-navy/60">{money.format(o.valor)} / un.</span>
              </span>
            </button>
          );
        })}
      </div>

      {combo.qtd_max > combo.qtd_min ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-store-navy/80">Litros / unidades</span>
          <div className="inline-flex items-center rounded-sm border border-store-navy/20 bg-white">
            <button
              type="button"
              aria-label="Diminuir"
              disabled={sel.quantidade <= combo.qtd_min}
              onClick={() => setSel((c) => ({ ...c, quantidade: c.quantidade - 1 }))}
              className="px-3 py-1.5 text-lg leading-none disabled:opacity-30"
            >
              −
            </button>
            <span className="min-w-8 text-center font-semibold tabular-nums">{sel.quantidade}</span>
            <button
              type="button"
              aria-label="Aumentar"
              disabled={sel.quantidade >= combo.qtd_max}
              onClick={() => setSel((c) => ({ ...c, quantidade: c.quantidade + 1 }))}
              className="px-3 py-1.5 text-lg leading-none disabled:opacity-30"
            >
              +
            </button>
          </div>
          <span className="text-xs text-store-navy/60">
            de {combo.qtd_min} a {combo.qtd_max}
          </span>
        </div>
      ) : null}

      <div className="space-y-0.5 border-t border-store-navy/10 pt-3">
        <p className="text-sm text-store-navy/50 line-through tabular-nums">{money.format(precos.normal)}</p>
        <p className="text-2xl font-bold tabular-nums text-[#1d63ed]">
          {money.format(precos.pix)}{" "}
          <span className="text-sm font-semibold text-orange-500">no PIX</span>
        </p>
        <p className="text-sm text-store-navy/80">
          ou <strong className="tabular-nums">{money.format(precos.cartao)}</strong> no cartão em até 3x sem juros
        </p>
      </div>

      <button
        type="button"
        disabled={semEstoque}
        onClick={comprar}
        className="inline-flex w-full items-center justify-center rounded-sm bg-store-accent px-5 py-3 text-sm font-bold text-black shadow-sm transition enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {semEstoque ? "Indisponível" : "Comprar combo kit + óleo"}
      </button>
    </section>
  );
}
