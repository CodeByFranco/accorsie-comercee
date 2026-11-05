"use client";

import { useActionState, useState } from "react";
import { ChoiceCard, type ChoiceDraft } from "@/features/kits/components/KitChoicesEditor";
import type { KitCategoriaOption } from "@/features/kits/components/KitEditForm";
import type { KitPickerProduct } from "@/features/kits/components/KitItemsPicker";
import { saveKitCombo, type SaveKitComboState } from "@/features/kits/services/saveKitCombo";
import type { KitComboConfig } from "@/types/kit";

const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

export function KitComboForm({
  initial,
  products,
  categorias,
}: {
  initial: KitComboConfig;
  products: KitPickerProduct[];
  categorias: KitCategoriaOption[];
}) {
  const [cfg, setCfg] = useState<KitComboConfig>(initial);
  const [state, action, pending] = useActionState<SaveKitComboState, FormData>(saveKitCombo, null);
  const byId = new Map(products.map((p) => [p.id, p]));

  const draft: ChoiceDraft = {
    key: "combo",
    nome: cfg.nome,
    qtd_min: cfg.qtd_min,
    qtd_max: cfg.qtd_max,
    qtd_padrao: cfg.qtd_padrao,
    product_ids: cfg.product_ids,
  };

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="combo_json" value={JSON.stringify(cfg)} />
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Combo para todos os kits</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre os produtos uma vez só (ex.: todos os óleos). Em cada kit, o cliente marca &quot;Leve junto&quot;,
          escolhe o produto e a quantidade, e ganha o desconto do combo nesse produto. Não precisa repetir nos kits.
        </p>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-900">
        <input
          type="checkbox"
          checked={cfg.ativo}
          onChange={(e) => setCfg((c) => ({ ...c, ativo: e.target.checked }))}
          className="h-5 w-5"
        />
        Combo ativo (aparece na página dos kits)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Desconto do combo (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={cfg.desconto_percent}
            onChange={(e) => setCfg((c) => ({ ...c, desconto_percent: Number(e.target.value) || 0 }))}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Mostrar em quais kits
          <select
            value={cfg.categoria_id}
            onChange={(e) => setCfg((c) => ({ ...c, categoria_id: e.target.value }))}
            className={fieldClass}
          >
            <option value="">Todos os kits</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                Só kits de {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ChoiceCard
        choice={draft}
        products={products}
        byId={byId}
        categorias={categorias}
        onPatch={(fields) => setCfg((c) => ({ ...c, ...fields }))}
        onRemove={() => setCfg((c) => ({ ...c, product_ids: [] }))}
      />

      {state ? (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-admin-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar combo"}
      </button>
    </form>
  );
}
