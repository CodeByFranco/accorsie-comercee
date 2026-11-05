"use client";

import { useMemo, useState } from "react";
import type { KitPickerProduct } from "@/features/kits/components/KitItemsPicker";
import type { KitCategoriaOption } from "@/features/kits/components/KitEditForm";
import type { KitChoiceInput } from "@/types/kit";

/** Busca sem acento e sem diferenciar maiúsculas ("oleo" encontra "Óleo"). */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

export type ChoiceDraft = KitChoiceInput & { key: string };

function toInput(draft: ChoiceDraft): KitChoiceInput {
  const { key, ...choice } = draft;
  void key;
  return choice;
}

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `choice-${keySeq}`;
}

export function KitChoicesEditor({
  products,
  categorias,
  initialChoices,
  descontoPercent,
  fixedTotal,
  onChange,
}: {
  products: KitPickerProduct[];
  categorias: KitCategoriaOption[];
  initialChoices: KitChoiceInput[];
  /** Percentual de desconto do kit (para mostrar a faixa de economia). */
  descontoPercent: number;
  /** Soma dos itens fixos (preço de catálogo). */
  fixedTotal: number;
  onChange?: (choices: KitChoiceInput[]) => void;
}) {
  const [choices, setChoicesState] = useState<ChoiceDraft[]>(() =>
    initialChoices.map((c) => ({ ...c, key: c.id ?? nextKey() })),
  );

  function setChoices(update: (prev: ChoiceDraft[]) => ChoiceDraft[]) {
    const next = update(choices);
    setChoicesState(next);
    onChange?.(next.map(toInput));
  }

  function patch(key: string, fields: Partial<KitChoiceInput>) {
    setChoices((prev) => prev.map((c) => (c.key === key ? { ...c, ...fields } : c)));
  }

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const payload = choices.map(toInput);

  const pct = Math.min(100, Math.max(0, descontoPercent)) / 100;
  const range = useMemo(() => {
    let min = fixedTotal;
    let max = fixedTotal;
    for (const c of choices) {
      const vals = c.product_ids.map((id) => byId.get(id)?.valor).filter((v): v is number => v != null);
      if (vals.length === 0) continue;
      min += Math.min(...vals) * c.qtd_min;
      max += Math.max(...vals) * c.qtd_max;
    }
    return { min, max };
  }, [choices, byId, fixedTotal]);

  return (
    <fieldset className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <legend className="text-sm font-semibold text-gray-900">Itens de escolha do cliente</legend>
      <input type="hidden" name="kit_choices_json" value={JSON.stringify(payload)} />
      <p className="text-xs text-gray-500">
        O cliente escolhe um dos produtos marcados e a quantidade, dentro do limite. Ex.: &quot;Óleo do motor&quot;
        com as viscosidades disponíveis, de 3 a 5 litros. Kits com escolha usam desconto percentual.
      </p>

      {choices.map((c) => (
        <ChoiceCard
          key={c.key}
          choice={c}
          products={products}
          byId={byId}
          categorias={categorias}
          onPatch={(fields) => patch(c.key, fields)}
          onRemove={() => setChoices((prev) => prev.filter((x) => x.key !== c.key))}
        />
      ))}

      <button
        type="button"
        onClick={() =>
          setChoices((prev) => [
            ...prev,
            { key: nextKey(), nome: "", qtd_min: 1, qtd_max: 1, qtd_padrao: 1, product_ids: [] },
          ])
        }
        className="rounded-lg border border-dashed border-admin-accent px-3 py-2 text-sm font-semibold text-admin-accent hover:bg-white"
      >
        + Adicionar item de escolha do cliente
      </button>

      {choices.length > 0 && range.max > 0 ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
          <p>
            Kit completo de <strong>{money.format(range.min * (1 - pct))}</strong> até{" "}
            <strong>{money.format(range.max * (1 - pct))}</strong>, conforme a escolha do cliente.
          </p>
          <p>
            Economia de {money.format(range.min * pct)} até {money.format(range.max * pct)}.
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}

export function ChoiceCard({
  choice,
  products,
  byId,
  categorias,
  onPatch,
  onRemove,
}: {
  choice: ChoiceDraft;
  products: KitPickerProduct[];
  byId: Map<string, KitPickerProduct>;
  categorias: KitCategoriaOption[];
  onPatch: (fields: Partial<KitChoiceInput>) => void;
  onRemove: () => void;
}) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");

  const selected = new Set(choice.product_ids);

  const filtered = useMemo(() => {
    const term = fold(q.trim());
    if (!term) return [];
    return products
      .filter((p) => !selected.has(p.id))
      .filter((p) => fold(p.titulo).includes(term) || fold(p.cod_produto).includes(term))
      .slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, q, choice.product_ids]);

  function setQtd(field: "qtd_min" | "qtd_max" | "qtd_padrao", raw: string) {
    const n = Math.max(1, Math.floor(Number(raw)) || 1);
    const next = { qtd_min: choice.qtd_min, qtd_max: choice.qtd_max, qtd_padrao: choice.qtd_padrao, [field]: n };
    if (field === "qtd_min" && next.qtd_max < n) next.qtd_max = n;
    if (field === "qtd_max" && next.qtd_min > n) next.qtd_min = n;
    next.qtd_padrao = Math.min(next.qtd_max, Math.max(next.qtd_min, next.qtd_padrao));
    onPatch(next);
  }

  function addFromCategoria() {
    if (!catId) return;
    const ids = products.filter((p) => p.categoria_ids?.includes(catId)).map((p) => p.id);
    onPatch({ product_ids: [...new Set([...choice.product_ids, ...ids])] });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Nome do item</label>
          <input
            value={choice.nome}
            onChange={(e) => onPatch({ nome: e.target.value })}
            placeholder="Óleo do motor"
            className={fieldClass}
          />
        </div>
        <button type="button" onClick={onRemove} className="mt-7 text-sm font-semibold text-red-600 hover:underline">
          Remover
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["qtd_min", "Qtd mínima"],
            ["qtd_padrao", "Qtd sugerida"],
            ["qtd_max", "Qtd máxima"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            {label}
            <input
              type="number"
              min={1}
              step={1}
              value={choice[field]}
              onChange={(e) => setQtd(field, e.target.value)}
              className={fieldClass}
            />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Opções que o cliente pode escolher ({choice.product_ids.length})</p>
        {choice.product_ids.length === 0 ? (
          <p className="text-xs text-amber-700">Nenhuma opção ainda. Adicione produtos abaixo.</p>
        ) : (
          <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100">
            {choice.product_ids.map((pid) => {
              const p = byId.get(pid);
              return (
                <li key={pid} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-900">{p?.titulo ?? "Produto removido"}</p>
                    <p className="text-xs text-gray-500">
                      {p?.cod_produto ?? pid}
                      {p ? ` · ${money.format(p.valor)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPatch({ product_ids: choice.product_ids.filter((x) => x !== pid) })}
                    className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {categorias.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className={`${fieldClass} flex-1`}>
            <option value="">Adicionar todos de uma categoria…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!catId}
            onClick={addFromCategoria}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 disabled:opacity-50"
          >
            Adicionar categoria
          </button>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar produto por nome ou código (ex.: 5W30)"
          className={`${fieldClass} w-full`}
        />
        {filtered.length > 0 ? (
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-100">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-gray-50 px-3 py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-900">{p.titulo}</p>
                  <p className="text-xs text-gray-500">
                    {p.cod_produto} · {money.format(p.valor)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPatch({ product_ids: [...choice.product_ids, p.id] })}
                  className="shrink-0 text-sm font-semibold text-admin-accent hover:underline"
                >
                  Adicionar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
