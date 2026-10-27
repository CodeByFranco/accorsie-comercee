"use client";

import { useMemo, useState } from "react";
import { computeKitPricing, type KitPricingResult } from "@/features/kits/utils/kitPricing";
import type { KitDiscountType } from "@/types/kit";

export type KitPickerProduct = {
  id: string;
  titulo: string;
  cod_produto: string;
  valor: number;
};

export type KitPickerItem = {
  product_id: string;
  quantidade: number;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

export function KitItemsPicker({
  products,
  initialItems,
  tipoDesconto,
  valorDesconto,
  precoFinal,
  onItemsChange,
}: {
  products: KitPickerProduct[];
  initialItems: KitPickerItem[];
  tipoDesconto: KitDiscountType;
  valorDesconto: number;
  precoFinal: number | null;
  onItemsChange?: (items: KitPickerItem[]) => void;
}) {
  const [items, setItemsState] = useState<KitPickerItem[]>(initialItems);

  function setItems(update: (prev: KitPickerItem[]) => KitPickerItem[]) {
    const next = update(items);
    setItemsState(next);
    onItemsChange?.(next);
  }
  const [q, setQ] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const pricing: KitPricingResult = useMemo(() => {
    return computeKitPricing({
      tipo_desconto: tipoDesconto,
      valor_desconto: valorDesconto,
      preco_final: precoFinal,
      items: items.map((it) => ({
        valor: byId.get(it.product_id)?.valor ?? 0,
        quantidade: it.quantidade,
      })),
    });
  }, [items, byId, tipoDesconto, valorDesconto, precoFinal]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const selected = new Set(items.map((i) => i.product_id));
    return products
      .filter((p) => !selected.has(p.id))
      .filter((p) => {
        if (!term) return true;
        return (
          p.titulo.toLowerCase().includes(term) ||
          p.cod_produto.toLowerCase().includes(term)
        );
      })
      .slice(0, 20);
  }, [products, items, q]);

  function addProduct(id: string) {
    setItems((prev) => [...prev, { product_id: id, quantidade: 1 }]);
  }

  function setQty(id: string, quantidade: number) {
    const qn = Math.max(1, Math.floor(quantidade) || 1);
    setItems((prev) => prev.map((it) => (it.product_id === id ? { ...it, quantidade: qn } : it)));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.product_id !== id));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="kit_items_json" value={JSON.stringify(items)} />

      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
        <p className="text-sm font-semibold text-gray-900">Resumo de preços</p>
        <dl className="mt-2 grid gap-1 text-sm text-gray-700 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-500">Preço normal</dt>
            <dd className="font-medium tabular-nums">{money.format(pricing.precoNormal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Preço do kit</dt>
            <dd className="font-semibold tabular-nums text-admin-accent">{money.format(pricing.precoKit)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Economia</dt>
            <dd className="font-medium tabular-nums text-emerald-700">{money.format(pricing.economia)}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-900">Itens do kit</p>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum produto adicionado ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {items.map((it) => {
              const p = byId.get(it.product_id);
              return (
                <li key={it.product_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p?.titulo ?? "Produto removido"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p?.cod_produto ?? it.product_id}
                      {p ? ` · ${money.format(p.valor)}` : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    Qtd
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={it.quantidade}
                      onChange={(e) => setQty(it.product_id, Number(e.target.value))}
                      className={`${fieldClass} w-20`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(it.product_id)}
                    className="text-sm font-semibold text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="kit-product-search" className="text-sm font-medium text-gray-700">
          Adicionar produto
        </label>
        <input
          id="kit-product-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou código"
          className={fieldClass}
        />
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-white">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-500">Nenhum produto encontrado.</li>
          ) : (
            filtered.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-gray-50 px-4 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{p.titulo}</p>
                  <p className="text-xs text-gray-500">
                    {p.cod_produto} · {money.format(p.valor)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(p.id)}
                  className="shrink-0 text-sm font-semibold text-admin-accent hover:underline"
                >
                  Adicionar
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
