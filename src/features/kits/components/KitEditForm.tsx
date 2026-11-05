"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { KitImageField } from "@/features/kits/components/KitImageField";
import {
  KitItemsPicker,
  type KitPickerItem,
  type KitPickerProduct,
} from "@/features/kits/components/KitItemsPicker";
import { KitChoicesEditor } from "@/features/kits/components/KitChoicesEditor";
import { KitPublishActions } from "@/features/kits/components/KitPublishActions";
import { updateKit, type UpdateKitState } from "@/features/kits/services/updateKit";
import type { KitChoiceInput, KitDiscountType } from "@/types/kit";
import type { KitStatus } from "@/features/kits/utils/kitStatus";
import { slugify } from "@/utils/slugify";

export type KitEditValues = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  imagem: string;
  tipo_desconto: KitDiscountType;
  valor_desconto: number;
  preco_final: number | null;
  seo_title: string;
  seo_description: string;
  status: KitStatus;
  categoria_id: string;
  /** Usa os % padrão PIX/cartão (e oferece o combo). Desmarcar p/ kits como suspensão. */
  usa_desconto_padrao: boolean;
  items: KitPickerItem[];
  choices: KitChoiceInput[];
};

export type KitCategoriaOption = { id: string; nome: string };

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

const initialState: UpdateKitState | null = null;

export function KitEditForm({
  kit,
  products,
  categorias,
}: {
  kit: KitEditValues;
  products: KitPickerProduct[];
  categorias: KitCategoriaOption[];
}) {
  const [state, formAction, pending] = useActionState(updateKit, initialState);
  const fieldsRequired = kit.status === "published";
  const [tipo, setTipo] = useState<KitDiscountType>(kit.tipo_desconto);
  const [usaPadrao, setUsaPadrao] = useState(kit.usa_desconto_padrao);
  const [valorDesconto, setValorDesconto] = useState(kit.valor_desconto);
  const [precoFinal, setPrecoFinal] = useState(kit.preco_final);
  const [nome, setNome] = useState(kit.nome);
  const [slug, setSlug] = useState(kit.slug);
  const [fixedItems, setFixedItems] = useState<KitPickerItem[]>(kit.items);
  const [choiceCount, setChoiceCount] = useState(kit.choices.length);
  const temEscolha = choiceCount > 0;
  const tipoEfetivo: KitDiscountType = temEscolha ? "percentual" : tipo;
  const itemProductIds = fixedItems.map((it) => it.product_id);
  const priceById = new Map(products.map((p) => [p.id, p.valor]));
  const fixedTotal = fixedItems.reduce((s, it) => s + (priceById.get(it.product_id) ?? 0) * it.quantidade, 0);

  return (
    <>
      <KitPublishActions kitId={kit.id} status={kit.status} />

      {state?.ok && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm" role="status">
          <p className="font-semibold text-emerald-900">Alterações salvas</p>
          <p className="mt-1 text-sm text-emerald-800/95">{state.message}</p>
          <Link href="/admin/kits" className="mt-3 inline-block text-sm font-semibold text-admin-accent hover:underline">
            Voltar à lista de kits
          </Link>
        </div>
      )}

      {state && !state.ok && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm" role="alert">
          <p className="font-semibold text-red-900">Algo deu errado</p>
          <p className="mt-1 text-sm text-red-800/95">{state.message}</p>
        </div>
      )}

      {state?.ok ? null : (
        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={kit.id} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">Nome</label>
            <input
              id="nome"
              name="nome"
              required={fieldsRequired && !usaPadrao}
              value={nome}
              onChange={(e) => {
                const v = e.target.value;
                setNome(v);
                if (!kit.slug) setSlug(slugify(v));
              }}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="slug" className="text-sm font-medium text-gray-700">Slug (URL)</label>
            <input
              id="slug"
              name="slug"
              required={fieldsRequired && !usaPadrao}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={fieldClass}
              placeholder="kit-revisao"
            />
            <p className="text-xs text-gray-500">Página pública: /kit/{slug || "…"}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoria_id" className="text-sm font-medium text-gray-700">Categoria</label>
            <select id="categoria_id" name="categoria_id" defaultValue={kit.categoria_id} className={fieldClass}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Usada no atalho do site, ex.: todos os kits de Suspensão.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="descricao" className="text-sm font-medium text-gray-700">Descrição</label>
            <textarea id="descricao" name="descricao" rows={4} defaultValue={kit.descricao} className={fieldClass} />
          </div>

          <KitImageField initialImagem={kit.imagem} productIds={itemProductIds} />

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <input
              type="checkbox"
              name="usa_desconto_padrao"
              checked={usaPadrao}
              onChange={(e) => setUsaPadrao(e.target.checked)}
              className="mt-0.5 h-5 w-5"
            />
            <span>
              <span className="block font-semibold text-gray-900">Usar desconto padrão dos kits</span>
              <span className="block text-xs text-gray-500">
                % no PIX/cartão e combo com óleo definidos em{" "}
                <a href="/admin/kits/combo" className="font-semibold text-admin-accent hover:underline">
                  Descontos e combo
                </a>
                . Desmarque para kits com desconto próprio (ex.: suspensão).
              </span>
            </span>
          </label>

          <fieldset
            className={`space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 ${usaPadrao ? "hidden" : ""}`}
          >
            <legend className="text-sm font-semibold text-gray-900">Desconto do kit</legend>
            <div className="flex flex-col gap-2">
              {(
                [
                  ["percentual", "Desconto percentual"],
                  ["valor_fixo", "Desconto em valor (R$)"],
                  ["preco_fixo", "Preço fixo do kit"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 text-sm ${temEscolha && value !== "percentual" ? "text-gray-400" : "text-gray-800"}`}
                >
                  <input
                    type="radio"
                    name="tipo_desconto"
                    value={value}
                    checked={tipoEfetivo === value}
                    disabled={temEscolha && value !== "percentual"}
                    onChange={() => setTipo(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            {temEscolha ? (
              <p className="text-xs text-gray-500">
                Este kit tem item de escolha do cliente, então o desconto é sempre percentual.
              </p>
            ) : null}
            {tipoEfetivo === "preco_fixo" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="preco_final" className="text-sm font-medium text-gray-700">Preço do kit (R$)</label>
                <input
                  id="preco_final"
                  name="preco_final"
                  type="number"
                  min={0}
                  step="0.01"
                  required={fieldsRequired && !usaPadrao}
                  value={precoFinal ?? ""}
                  onChange={(e) => setPrecoFinal(e.target.value === "" ? null : Number(e.target.value))}
                  className={fieldClass}
                />
                <input type="hidden" name="valor_desconto" value={0} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="valor_desconto" className="text-sm font-medium text-gray-700">
                  {tipoEfetivo === "percentual" ? "Percentual (%)" : "Valor do desconto (R$)"}
                </label>
                <input
                  id="valor_desconto"
                  name="valor_desconto"
                  type="number"
                  min={0}
                  max={tipoEfetivo === "percentual" ? 100 : undefined}
                  step="0.01"
                  required={fieldsRequired && !usaPadrao}
                  value={valorDesconto}
                  onChange={(e) => setValorDesconto(Number(e.target.value) || 0)}
                  className={fieldClass}
                />
              </div>
            )}
          </fieldset>

          <KitItemsPicker
            products={products}
            initialItems={kit.items}
            tipoDesconto={tipoEfetivo}
            valorDesconto={valorDesconto}
            precoFinal={precoFinal}
            onItemsChange={setFixedItems}
            hideSummary={temEscolha}
          />

          <KitChoicesEditor
            products={products}
            categorias={categorias}
            initialChoices={kit.choices}
            descontoPercent={tipoEfetivo === "percentual" ? valorDesconto : 0}
            fixedTotal={fixedTotal}
            onChange={(choices) => setChoiceCount(choices.length)}
          />

          <fieldset className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <legend className="text-sm font-semibold text-gray-900">SEO</legend>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="seo_title" className="text-sm font-medium text-gray-700">Title</label>
              <input id="seo_title" name="seo_title" defaultValue={kit.seo_title} className={fieldClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="seo_description" className="text-sm font-medium text-gray-700">Meta description</label>
              <textarea
                id="seo_description"
                name="seo_description"
                rows={2}
                defaultValue={kit.seo_description}
                className={fieldClass}
              />
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-admin-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1857d1] disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      )}
    </>
  );
}
